import base64
import uuid
from datetime import datetime, timedelta

import pytest

from app.security import access_control
from app.security.access_control import create_session
from app.security.challenge_manager import ChallengeManager
from app.security.device_binding_store import DeviceBindingStore
from app.security.kyber_crystal import KyberCrystal
from app.services.certificate_service import CertificateService
from app.services.role_service import RoleService
from app.services.transaction_service import TransactionService
from app.utils.logger import AuditLogger


TEST_RSA_PUBLIC_KEY = "BASE64PUBLICKEY=="
TEST_ML_KEM_PUBLIC_KEY = base64.b64encode(b"test-mlkem-public-key").decode("ascii")


def _build_certificate_payload(
    *,
    role="customer",
    actions=None,
    certificate_id="cert-test",
    user_id="user-test",
    owner="Test User",
    cert_hash=None,
):
    return {
        "certificate_id": certificate_id,
        "user_id": user_id,
        "owner": owner,
        "role": role,
        "allowed_actions": actions or [],
        "valid_to": "2099-01-01T00:00:00Z",
        "lineage_id": "lineage-test",
        "cert_hash": cert_hash or f"hash-{certificate_id}",
    }


def _issue_session(
    token: str, certificate_payload: dict, *, device_secret="session-device-secret"
) -> str:
    user = {
        "id": certificate_payload["user_id"],
        "name": certificate_payload["owner"],
        "role": certificate_payload["role"],
    }
    DeviceBindingStore.store_secret(certificate_payload["user_id"], device_secret)
    binding = {
        "device_id": CertificateService.derive_device_id(device_secret),
        "cert_hash": certificate_payload.get("cert_hash"),
        "role": certificate_payload.get("role"),
    }
    refresh_token = f"refresh-{uuid.uuid4().hex}"
    create_session(
        token,
        user,
        certificate_payload,
        binding=binding,
        refresh_token=refresh_token,
    )
    return token, refresh_token


@pytest.fixture(autouse=True)
def reset_sessions():
    yield
    access_control.ACTIVE_SESSIONS.clear()


@pytest.fixture(autouse=True)
def reset_challenges():
    ChallengeManager._challenges.clear()
    yield
    ChallengeManager._challenges.clear()


@pytest.fixture(autouse=True)
def stub_transaction_layer(monkeypatch):
    monkeypatch.setattr(
        TransactionService,
        "get_all_transactions",
        lambda: [{"id": "tx-001", "amount": 250}],
    )
    monkeypatch.setattr(
        TransactionService,
        "get_user_transactions",
        lambda _user_id: [{"id": "tx-own", "amount": 10}],
    )
    monkeypatch.setattr(
        TransactionService,
        "create_transaction",
        lambda _user, _to_account, _amount: {"id": "tx-new"},
    )
    monkeypatch.setattr(
        TransactionService,
        "approve_transaction",
        lambda tx_id, user: {"id": tx_id, "approved_by": user["id"]},
    )
    monkeypatch.setattr(AuditLogger, "log_action", lambda *args, **kwargs: None)


@pytest.fixture
def certificate_state(monkeypatch):
    state = {
        "payload": _build_certificate_payload(),
        "revoked": False,
    }

    def _load_certificate(certificate_id, preferred_role=None):
        return state["payload"], "/tmp/mock.pem"

    def _verify_certificate(payload):
        return payload

    def _is_revoked(_certificate_id):
        return state["revoked"]

    monkeypatch.setattr(
        CertificateService,
        "load_certificate_payload",
        _load_certificate,
    )
    monkeypatch.setattr(CertificateService, "verify_certificate", _verify_certificate)
    monkeypatch.setattr(CertificateService, "is_revoked", _is_revoked)
    return state


@pytest.fixture
def mock_signature_verifier(monkeypatch):
    def _verify_rsa(_certificate, _message, signature_b64):
        if signature_b64 != "rsa-ok":
            raise Exception("Invalid RSA login signature")

    monkeypatch.setattr(
        CertificateService,
        "verify_client_rsa_signature",
        _verify_rsa,
    )
    monkeypatch.setattr(
        CertificateService,
        "verify_client_pq_signature",
        lambda *_args, **_kwargs: None,
    )


@pytest.fixture(autouse=True)
def device_binding_cache(monkeypatch):
    cache = {}

    def _store_binding(
        user_id,
        *,
        device_secret=None,
    ):
        if not user_id:
            return
        entry = cache.setdefault(user_id, {})
        if device_secret:
            entry["device_secret"] = device_secret

    def _store_secret(user_id, secret):
        _store_binding(user_id, device_secret=secret)

    def _get_secret(user_id):
        entry = cache.get(user_id) or {}
        return entry.get("device_secret")

    monkeypatch.setattr(DeviceBindingStore, "store_binding", _store_binding)
    monkeypatch.setattr(DeviceBindingStore, "store_secret", _store_secret)
    monkeypatch.setattr(DeviceBindingStore, "get_secret", _get_secret)
    return cache


@pytest.fixture(autouse=True)
def mock_kyber(monkeypatch):
    ciphertext_b64 = base64.b64encode(b"test-ciphertext").decode("ascii")
    shared_secret_bytes = b"test-shared-secret"
    shared_secret_b64 = base64.b64encode(shared_secret_bytes).decode("ascii")

    def _generate_keypair():
        return {
            "public_key": TEST_ML_KEM_PUBLIC_KEY,
            "private_key": base64.b64encode(b"test-mlkem-private-key").decode("ascii"),
        }

    def _encapsulate(_public_key_b64):
        return {"ciphertext": ciphertext_b64, "shared_secret": shared_secret_b64}

    def _decapsulate(_private_key_b64, _ciphertext_b64):
        return shared_secret_bytes

    monkeypatch.setattr(
        KyberCrystal, "generate_keypair", staticmethod(_generate_keypair)
    )
    monkeypatch.setattr(KyberCrystal, "encapsulate", staticmethod(_encapsulate))
    monkeypatch.setattr(KyberCrystal, "decapsulate", staticmethod(_decapsulate))
    return {
        "ciphertext_b64": ciphertext_b64,
        "shared_secret_bytes": shared_secret_bytes,
        "shared_secret_b64": shared_secret_b64,
    }


def test_copy_paste_protected_url_denied_for_wrong_role(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-customer",
        user_id="user-customer",
    )
    token, _ = _issue_session("token-customer", certificate_state["payload"])

    response = client.get(
        "/api/transactions/all",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "Role not authorized" in response.get_json()["message"]


def test_page_refresh_rechecks_role_after_downgrade(client, certificate_state):
    certificate_id = "cert-refresh"
    certificate_state["payload"] = _build_certificate_payload(
        role="manager",
        actions=["APPROVE_TRANSACTION"],
        certificate_id=certificate_id,
        user_id="manager-1",
    )
    token, _ = _issue_session("token-refresh", certificate_state["payload"])

    first_response = client.post(
        "/api/transactions/approve/tx-007",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first_response.status_code == 200

    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id=certificate_id,
        user_id="manager-1",
    )
    second_response = client.post(
        "/api/transactions/approve/tx-007",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert second_response.status_code == 403
    assert "Role not authorized" in second_response.get_json()["message"]


def test_revoked_certificate_loses_access_immediately(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-revoked",
        user_id="user-revoked",
    )
    token, _ = _issue_session("token-revoked", certificate_state["payload"])
    certificate_state["revoked"] = True

    response = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "revoked" in response.get_json()["message"].lower()


def test_direct_api_call_without_frontend_token_is_blocked(client):
    response = client.get("/api/transactions/all")

    assert response.status_code == 401
    assert "Missing Authorization" in response.get_json()["message"]


def test_customer_registration_requires_client_public_key(client):
    payload = {
        "full_name": "Alice",
        "email": "alice@example.com",
        "device_secret": "device-secret-123",
        "password": "strongpassword",
    }

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 400
    assert "Client RSA public key" in response.get_json()["message"]


def test_customer_registration_accepts_only_public_key(monkeypatch, client):
    captured = {}

    def _issue_certificate(**kwargs):
        captured.update(kwargs)
        return {
            "certificate_pem": "owner=Alice",
            "crypto_suite": {"classical_signature": "RSA"},
            "cert_hash": "hash-register",
        }

    monkeypatch.setattr(
        CertificateService,
        "issue_customer_certificate",
        _issue_certificate,
    )

    payload = {
        "full_name": "Alice",
        "email": "alice@example.com",
        "device_secret": "device-secret-123",
        "password": "strongpassword",
        "client_public_keys": {
            "rsa_spki": TEST_RSA_PUBLIC_KEY,
            "ml_kem_public_key": TEST_ML_KEM_PUBLIC_KEY,
        },
    }

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 201
    assert captured["rsa_public_key_spki"] == TEST_RSA_PUBLIC_KEY
    assert captured["ml_kem_public_key_b64"] == TEST_ML_KEM_PUBLIC_KEY
    assert "rsa_private" not in "".join(captured.keys())


def test_customer_registration_autogenerates_missing_ml_kem_key(monkeypatch, client):
    captured = {}

    def _issue_certificate(**kwargs):
        captured.update(kwargs)
        return {
            "certificate_pem": "owner=Alice",
            "crypto_suite": {"classical_signature": "RSA"},
            "cert_hash": "hash-register-auto",
            "device_secret": "auto-device-secret",
            "ml_kem_public_key": kwargs.get("ml_kem_public_key_b64"),
        }

    monkeypatch.setattr(
        CertificateService,
        "issue_customer_certificate",
        _issue_certificate,
    )

    payload = {
        "full_name": "Alice",
        "email": "alice@example.com",
        "device_secret": "device-secret-123",
        "password": "strongpassword",
        "client_public_keys": {"rsa_spki": TEST_RSA_PUBLIC_KEY},
    }

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 201
    body = response.get_json()
    assert body.get("ml_kem_auto_generated") is True
    assert isinstance(body.get("ml_kem_public_key"), str)
    assert body["ml_kem_public_key"]
    assert captured["ml_kem_public_key_b64"] == body["ml_kem_public_key"]


def test_issue_role_certificate_requires_client_key(client):
    payload = {
        "role": "manager",
        "full_name": "Max Manager",
        "device_secret": "secret",
    }

    response = client.post(
        "/api/auth/issue-role-certificate",
        headers={"X-ADMIN-SECRET": "pq_ca_master_key"},
        json=payload,
    )

    assert response.status_code == 400
    assert "Client RSA public key" in response.get_json()["message"]


def test_issue_role_certificate_requires_ml_kem_public_key(client):
    payload = {
        "role": "manager",
        "full_name": "Max Manager",
        "device_secret": "secret",
        "client_public_keys": {"rsa_spki": TEST_RSA_PUBLIC_KEY},
    }

    response = client.post(
        "/api/auth/issue-role-certificate",
        headers={"X-ADMIN-SECRET": "pq_ca_master_key"},
        json=payload,
    )

    assert response.status_code == 400
    assert "ML-KEM" in response.get_json()["message"]


def test_issue_role_certificate_consumes_client_public_key(monkeypatch, client):
    captured = {}

    def _issue_certificate(**kwargs):
        captured.update(kwargs)
        return {
            "certificate_pem": "owner=Max",
            "crypto_suite": {"classical_signature": "RSA"},
        }

    monkeypatch.setattr(
        CertificateService,
        "issue_customer_certificate",
        _issue_certificate,
    )

    payload = {
        "role": "manager",
        "full_name": "Max Manager",
        "device_secret": "secret",
        "client_public_keys": {
            "rsa_spki": TEST_RSA_PUBLIC_KEY,
            "ml_kem_public_key": TEST_ML_KEM_PUBLIC_KEY,
        },
    }

    response = client.post(
        "/api/auth/issue-role-certificate",
        headers={"X-ADMIN-SECRET": "pq_ca_master_key"},
        json=payload,
    )

    assert response.status_code == 201
    assert captured["rsa_public_key_spki"] == TEST_RSA_PUBLIC_KEY
    assert captured["ml_kem_public_key_b64"] == TEST_ML_KEM_PUBLIC_KEY


def test_certificate_login_requires_rsa_signature(
    client, certificate_state, mock_signature_verifier
):
    certificate = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-login",
        user_id="user-login",
    )
    certificate_state["payload"] = certificate
    device_secret = "secret-login"
    device_id = CertificateService.derive_device_id(device_secret)
    challenge = ChallengeManager.create_challenge(
        certificate,
        device_secret,
        ttl_seconds=180,
        purpose="certificate_login",
        metadata={"device_id": device_id},
    )
    device_proof = CertificateService.compute_device_proof(
        device_secret, challenge["nonce"]
    )

    response = client.post(
        "/api/auth/certificate-login",
        json={
            "challenge_token": challenge["token"],
            "device_id": device_id,
            "device_proof": device_proof,
            "pq_signature": None,
        },
    )

    assert response.status_code == 400
    assert "Missing" in response.get_json()["message"]


def test_certificate_login_succeeds_with_signed_challenge(
    client, certificate_state, mock_signature_verifier
):
    certificate = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-login-ok",
        user_id="user-login-ok",
    )
    certificate_state["payload"] = certificate
    device_secret = "secret-ok"
    device_id = CertificateService.derive_device_id(device_secret)
    challenge = ChallengeManager.create_challenge(
        certificate,
        device_secret,
        ttl_seconds=180,
        purpose="certificate_login",
        metadata={"device_id": device_id},
    )
    device_proof = CertificateService.compute_device_proof(
        device_secret, challenge["nonce"]
    )

    response = client.post(
        "/api/auth/certificate-login",
        json={
            "challenge_token": challenge["token"],
            "device_id": device_id,
            "device_proof": device_proof,
            "rsa_signature": "rsa-ok",
            "pq_signature": None,
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["role"] == "customer"


def test_system_admin_certificate_login_matches_role_permissions(
    client, certificate_state, mock_signature_verifier
):
    allowed_actions = RoleService.ROLE_PERMISSIONS.get("system_admin") or []
    certificate = _build_certificate_payload(
        role="system_admin",
        actions=allowed_actions,
        certificate_id="cert-admin-login",
        user_id="system-admin-user",
    )
    certificate_state["payload"] = certificate
    device_secret = "admin-secret"
    device_id = CertificateService.derive_device_id(device_secret)
    challenge = ChallengeManager.create_challenge(
        certificate,
        device_secret,
        ttl_seconds=180,
        purpose="certificate_login",
        metadata={"device_id": device_id},
    )
    device_proof = CertificateService.compute_device_proof(
        device_secret, challenge["nonce"]
    )

    response = client.post(
        "/api/auth/certificate-login",
        json={
            "challenge_token": challenge["token"],
            "device_id": device_id,
            "device_proof": device_proof,
            "rsa_signature": "rsa-ok",
            "pq_signature": None,
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["role"] == "system_admin"
    assert set(body["user"].get("allowed_actions", [])) == set(allowed_actions)


def test_qr_login_flow_succeeds(
    client,
    certificate_state,
    device_binding_cache,
    mock_signature_verifier,
):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="qr-cert",
        user_id="qr-user",
    )
    device_secret = "qr-device-secret"
    device_binding_cache["qr-user"] = {"device_secret": device_secret}

    challenge_response = client.post(
        "/api/auth/qr-challenge",
        json={
            "certificate_id": "qr-cert",
            "cert_hash": certificate_state["payload"]["cert_hash"],
        },
    )

    assert challenge_response.status_code == 200
    payload = challenge_response.get_json()
    nonce_bytes = base64.b64decode(payload["nonce"])
    device_proof = CertificateService.compute_device_proof_legacy(
        device_secret, nonce_bytes
    )
    login_response = client.post(
        "/api/auth/qr-login",
        json={
            "challenge_token": payload["challenge_token"],
            "device_id": payload["device_id"],
            "rsa_signature": "rsa-ok",
            "device_proof": device_proof,
            "pq_signature": None,
        },
    )

    assert login_response.status_code == 200
    body = login_response.get_json()
    assert body["user"]["id"] == "qr-user"
    assert body["message"] == "QR login successful"


def test_qr_challenge_rejects_hash_mismatch(
    client,
    certificate_state,
    device_binding_cache,
):
    certificate_state["payload"] = _build_certificate_payload(
        certificate_id="qr-cert-bad",
        user_id="qr-user-bad",
    )
    device_binding_cache["qr-user-bad"] = {"device_secret": "qr-secret-bad"}

    response = client.post(
        "/api/auth/qr-challenge",
        json={
            "certificate_id": "qr-cert-bad",
            "cert_hash": "bogus-hash",
        },
    )

    assert response.status_code == 403
    assert "hash" in response.get_json()["message"].lower()


def test_session_reverify_succeeds_with_signed_challenge(
    client, certificate_state, device_binding_cache, mock_signature_verifier
):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-reauth",
        user_id="user-reauth",
    )
    device_secret = "secret-reauth"
    token, _ = _issue_session(
        "token-reauth", certificate_state["payload"], device_secret=device_secret
    )

    challenge_resp = client.post(
        "/api/auth/session-rechallenge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert challenge_resp.status_code == 200
    payload = challenge_resp.get_json()

    nonce_bytes = base64.b64decode(payload["nonce"])
    device_proof = CertificateService.compute_device_proof(device_secret, nonce_bytes)

    verify_resp = client.post(
        "/api/auth/session-reverify",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "challenge_token": payload["challenge_token"],
            "device_id": payload["device_id"],
            "device_proof": device_proof,
            "rsa_signature": "rsa-ok",
            "pq_signature": None,
        },
    )

    assert verify_resp.status_code == 200
    body = verify_resp.get_json()
    assert body["message"] == "Session re-authenticated"


def test_session_reverify_failure_logs_out_session(
    client, certificate_state, device_binding_cache, mock_signature_verifier
):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-reauth-fail",
        user_id="user-reauth-fail",
    )
    device_secret = "secret-fail"
    token, _ = _issue_session(
        "token-reauth-fail",
        certificate_state["payload"],
        device_secret=device_secret,
    )

    challenge_resp = client.post(
        "/api/auth/session-rechallenge",
        headers={"Authorization": f"Bearer {token}"},
    )
    nonce_bytes = base64.b64decode(challenge_resp.get_json()["nonce"])
    bad_proof = CertificateService.compute_device_proof("wrong", nonce_bytes)

    verify_resp = client.post(
        "/api/auth/session-reverify",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "challenge_token": challenge_resp.get_json()["challenge_token"],
            "device_id": challenge_resp.get_json()["device_id"],
            "device_proof": bad_proof,
            "rsa_signature": "bad",
        },
    )

    assert verify_resp.status_code == 403

    follow_on = client.post(
        "/api/auth/session-rechallenge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert follow_on.status_code == 401


def test_session_key_endpoint_requires_public_key(client, certificate_state):
    certificate = _build_certificate_payload(
        certificate_id="cert-session-missing",
        user_id="user-session-missing",
    )
    certificate_state["payload"] = certificate
    token, _ = _issue_session("token-session-missing", certificate)

    response = client.post(
        "/api/auth/session-key",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert response.status_code == 400
    assert "ml_kem_public_key" in response.get_json()["message"]


def test_session_key_endpoint_derives_and_tracks_key(
    client, certificate_state, mock_kyber
):
    certificate = _build_certificate_payload(
        certificate_id="cert-session",
        user_id="user-session",
    )
    certificate_state["payload"] = certificate
    token, _ = _issue_session("token-session", certificate)

    client_ml_kem_key = base64.b64encode(b"client-session-key").decode("ascii")
    response = client.post(
        "/api/auth/session-key",
        headers={"Authorization": f"Bearer {token}"},
        json={"ml_kem_public_key": client_ml_kem_key},
    )

    assert response.status_code == 200
    body = response.get_json()
    key_meta = body["key"]
    assert body["message"] == "Session key established"
    assert key_meta["encapsulation"]["alg"] == KyberCrystal.ALG_NAME
    assert key_meta["encapsulation"]["ciphertext"] == mock_kyber["ciphertext_b64"]
    assert key_meta["kdf"]["alg"] == "HKDF-SHA3-256"

    session = access_control.ACTIVE_SESSIONS[token]
    stored_key = session["session_keys"][key_meta["key_id"]]
    expected_key = KyberCrystal.derive_session_aes_key(
        mock_kyber["shared_secret_bytes"], certificate["cert_hash"]
    )
    assert stored_key["alg"] == "AES-256-GCM"
    assert stored_key["key_b64"] == base64.b64encode(expected_key).decode("ascii")


def test_access_token_expiration_requires_refresh(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-expire",
        user_id="user-expire",
    )
    token, _ = _issue_session("token-expire", certificate_state["payload"])
    session = access_control.ACTIVE_SESSIONS[token]
    session["access_expires_at"] = datetime.utcnow() - timedelta(seconds=1)

    response = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert "Access token expired" in response.get_json()["message"]


def test_refresh_endpoint_rotates_tokens(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-refresh-token",
        user_id="user-refresh",
    )
    token, refresh_token = _issue_session(
        "token-refresh-token", certificate_state["payload"]
    )

    client.set_cookie("pq_refresh_token", refresh_token, domain="localhost")
    response = client.post("/api/auth/refresh")

    assert response.status_code == 200
    new_token = response.get_json()["token"]
    assert new_token != token
    assert "pq_refresh_token" in (response.headers.get("Set-Cookie") or "")

    old_resp = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert old_resp.status_code == 401

    new_resp = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert new_resp.status_code == 200


def test_idle_timeout_enforced(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-idle",
        user_id="user-idle",
    )
    token, _ = _issue_session("token-idle", certificate_state["payload"])
    session = access_control.ACTIVE_SESSIONS[token]
    session["last_activity"] = session["created_at"] - timedelta(
        seconds=access_control.IDLE_TIMEOUT_SECONDS + 5
    )

    response = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert "inactivity" in response.get_json()["message"].lower()


def test_absolute_timeout_enforced(client, certificate_state):
    certificate_state["payload"] = _build_certificate_payload(
        role="customer",
        actions=["VIEW_OWN"],
        certificate_id="cert-absolute",
        user_id="user-absolute",
    )
    token, _ = _issue_session("token-absolute", certificate_state["payload"])
    session = access_control.ACTIVE_SESSIONS[token]
    session["absolute_deadline"] = datetime.utcnow() - timedelta(seconds=1)

    response = client.get(
        "/api/transactions/my",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert "session expired" in response.get_json()["message"].lower()
