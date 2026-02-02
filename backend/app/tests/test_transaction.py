import uuid

import pytest

from app.models.customer_model import Customer
from app.security import access_control
from app.security.access_control import create_session
from app.security.device_binding_store import DeviceBindingStore
from app.services.certificate_service import CertificateService
from app.services.transaction_service import TransactionService


_TEST_CERTIFICATES = {}


def _issue_session_token(user_id, role, actions):
    certificate = {
        "certificate_id": f"cert-{user_id}-{role}",
        "user_id": user_id,
        "owner": f"{user_id}-tester",
        "role": role,
        "allowed_actions": actions,
        "valid_to": "2099-01-01T00:00:00Z",
        "lineage_id": "lineage-test",
        "cert_hash": f"hash-{user_id}-{role}",
    }
    _TEST_CERTIFICATES[certificate["certificate_id"]] = certificate
    token = f"token-{uuid.uuid4().hex}"
    device_secret = f"secret-{user_id}"
    DeviceBindingStore.store_secret(user_id, device_secret)
    binding = {
        "device_id": CertificateService.derive_device_id(device_secret),
        "cert_hash": certificate["cert_hash"],
        "role": role,
    }
    refresh_token = f"refresh-{uuid.uuid4().hex}"
    create_session(
        token,
        {"id": user_id, "name": certificate["owner"], "role": role},
        certificate,
        binding=binding,
        refresh_token=refresh_token,
    )
    return token


def _default_actions_for_role(role: str):
    if role == "manager":
        return ["APPROVE_TRANSACTION", "APPROVE_HIGH_VALUE", "VIEW_OWN"]
    return ["VIEW_OWN", "CREATE_TRANSACTION"]


def _test_headers(user_id, role="customer", actions=None):
    resolved_actions = actions or _default_actions_for_role(role)
    token = _issue_session_token(user_id, role, resolved_actions)
    return {
        "Authorization": f"Bearer {token}",
    }


def _manager_headers(user_id="manager-reviewer"):
    return _test_headers(
        user_id,
        role="manager",
        actions=["APPROVE_TRANSACTION", "APPROVE_HIGH_VALUE", "VIEW_OWN"],
    )


@pytest.fixture(autouse=True)
def reset_transaction_sessions():
    yield
    access_control.ACTIVE_SESSIONS.clear()
    access_control.REFRESH_INDEX.clear()
    _TEST_CERTIFICATES.clear()


@pytest.fixture(autouse=True)
def stub_certificate_verification(monkeypatch):
    def _load(cert_id, preferred_role=None):
        payload = _TEST_CERTIFICATES.get(cert_id)
        if not payload:
            raise FileNotFoundError(cert_id)
        return payload, "/tmp/mock.pem"

    def _verify(payload):
        return payload

    monkeypatch.setattr(CertificateService, "load_certificate_payload", _load)
    monkeypatch.setattr(CertificateService, "verify_certificate", _verify)
    yield


def _create_transaction(client, seed_ledger, amount, purpose="Automated test transfer"):
    payload = {
        "to_account": seed_ledger["beneficiary_account"],
        "amount": amount,
        "purpose": purpose,
    }
    response = client.post(
        "/api/transactions/create",
        json=payload,
        headers=_test_headers(seed_ledger["sender_id"]),
    )
    assert response.status_code == 201
    return response.get_json()


def test_create_transaction_low_value(client, seed_ledger, app_with_db):
    amount = 5000
    data = _create_transaction(client, seed_ledger, amount)

    assert data["status"] == "COMPLETED"
    assert data["requires_manager_approval"] is False
    assert data["auto_approved"] is True
    assert data["approved_by"] == TransactionService.AUTO_APPROVER
    assert data["auto_approval_limit"] == str(TransactionService.AUTO_APPROVAL_LIMIT)
    assert data["purpose"] == "Automated test transfer"

    with app_with_db.app_context():
        sender = Customer.query.get(seed_ledger["sender_id"])
        beneficiary = Customer.query.filter_by(
            account_number=seed_ledger["beneficiary_account"]
        ).first()

        assert float(sender.balance) == pytest.approx(250000.0 - amount, rel=1e-6)
        assert float(beneficiary.balance) == pytest.approx(50000.0 + amount, rel=1e-6)


def test_create_transaction_high_value_requires_manager(
    client, seed_ledger, app_with_db
):
    amount = 150000
    data = _create_transaction(client, seed_ledger, amount)

    assert data["status"] == "PENDING"
    assert data["requires_manager_approval"] is True
    assert data["auto_approved"] is False
    assert data["approved_by"] is None

    with app_with_db.app_context():
        sender = Customer.query.get(seed_ledger["sender_id"])
        beneficiary = Customer.query.filter_by(
            account_number=seed_ledger["beneficiary_account"]
        ).first()

        assert float(sender.balance) == pytest.approx(250000.0, rel=1e-6)
        assert float(beneficiary.balance) == pytest.approx(50000.0, rel=1e-6)


def test_transaction_history(client, seed_ledger):
    created = _create_transaction(client, seed_ledger, 2500)

    response = client.get(
        "/api/transactions/history",
        headers=_test_headers(seed_ledger["sender_id"]),
    )
    assert response.status_code == 200

    data = response.get_json()
    assert isinstance(data, list)
    assert any(tx["id"] == created["id"] and tx["direction"] == "SENT" for tx in data)


def test_transaction_history_includes_received(client, seed_ledger):
    created = _create_transaction(client, seed_ledger, 2500)

    response = client.get(
        "/api/transactions/history",
        headers=_test_headers(seed_ledger["beneficiary_id"]),
    )
    assert response.status_code == 200

    data = response.get_json()
    assert isinstance(data, list)
    assert any(
        tx["id"] == created["id"] and tx["direction"] == "RECEIVED" for tx in data
    )


def test_create_transaction_equal_auto_limit_is_auto_approved(
    client, seed_ledger, app_with_db
):
    amount = float(TransactionService.AUTO_APPROVAL_LIMIT)
    data = _create_transaction(client, seed_ledger, amount)

    assert data["status"] == "COMPLETED"
    assert data["requires_manager_approval"] is False
    assert data["auto_approved"] is True

    with app_with_db.app_context():
        sender = Customer.query.get(seed_ledger["sender_id"])
        beneficiary = Customer.query.filter_by(
            account_number=seed_ledger["beneficiary_account"]
        ).first()

        assert float(sender.balance) == pytest.approx(250000.0 - amount, rel=1e-6)
        assert float(beneficiary.balance) == pytest.approx(50000.0 + amount, rel=1e-6)


def test_manager_approves_transaction(client, seed_ledger, app_with_db):
    amount = 200000
    pending = _create_transaction(client, seed_ledger, amount)
    assert pending["status"] == "PENDING"

    with app_with_db.app_context():
        sender_before = float(Customer.query.get(seed_ledger["sender_id"]).balance)
        beneficiary_before = float(
            Customer.query.filter_by(account_number=seed_ledger["beneficiary_account"])
            .first()
            .balance
        )
        assert sender_before == pytest.approx(250000.0, rel=1e-6)
        assert beneficiary_before == pytest.approx(50000.0, rel=1e-6)

    response = client.post(
        f"/api/transactions/approve/{pending['id']}",
        json={"action": "approve"},
        headers=_manager_headers(),
    )
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "APPROVED"
    assert data["approved_by"] == "manager-reviewer"

    with app_with_db.app_context():
        sender = Customer.query.get(seed_ledger["sender_id"])
        beneficiary = Customer.query.filter_by(
            account_number=seed_ledger["beneficiary_account"]
        ).first()

        assert float(sender.balance) == pytest.approx(250000.0 - amount, rel=1e-6)
        assert float(beneficiary.balance) == pytest.approx(50000.0 + amount, rel=1e-6)


def test_manager_rejects_transaction(client, seed_ledger, app_with_db):
    amount = 180000
    pending = _create_transaction(client, seed_ledger, amount)
    assert pending["status"] == "PENDING"

    response = client.post(
        f"/api/transactions/approve/{pending['id']}",
        json={"action": "REJECT", "reason": "Manual review"},
        headers=_manager_headers(),
    )
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "REJECTED"
    assert data["approved_by"] == "manager-reviewer"
    assert data.get("decision_reason") == "Manual review"

    with app_with_db.app_context():
        sender = Customer.query.get(seed_ledger["sender_id"])
        beneficiary = Customer.query.filter_by(
            account_number=seed_ledger["beneficiary_account"]
        ).first()

        assert float(sender.balance) == pytest.approx(250000.0, rel=1e-6)
        assert float(beneficiary.balance) == pytest.approx(50000.0, rel=1e-6)


def test_transaction_detail_for_sender(client, seed_ledger):
    created = _create_transaction(client, seed_ledger, 2500)

    response = client.get(
        f"/api/transactions/{created['id']}",
        headers=_test_headers(seed_ledger["sender_id"]),
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["direction"] == "SENT"
    assert data["id"] == created["id"]


def test_transaction_detail_for_receiver(client, seed_ledger):
    created = _create_transaction(client, seed_ledger, 2500)

    response = client.get(
        f"/api/transactions/{created['id']}",
        headers=_test_headers(seed_ledger["beneficiary_id"]),
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["direction"] == "RECEIVED"
    assert data["id"] == created["id"]
