import base64
import hashlib
import os
import secrets
import uuid
from typing import Optional
from decimal import Decimal
from datetime import datetime, timedelta
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file, current_app
from sqlalchemy import func
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.services.certificate_service import CertificateService
from app.security.access_control import (
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
    REFRESH_ENDPOINT,
    create_session,
    destroy_session,
    enforce_session_state,
    mark_session_verified,
    refresh_session_tokens,
    require_certificate,
    session_requires_reauth,
    validate_session_certificate,
)
from app.security.certificate_delivery import CertificateDelivery
from app.security.certificate_vault import CertificateVaultError
from app.security.challenge_manager import ChallengeManager
from app.security.device_binding_store import DeviceBindingStore
from app.security.accountability_store import AccountabilityStore
from app.security.kyber_crystal import KyberCrystal
from app.models.customer_model import Customer, CustomerStatus
from app.models.user_model import User
from app.models.role_model import Role
from app.config.database import db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ALL_ROLES = ["customer", "manager", "auditor_clerk"]
ADMIN_MANAGED_ROLES = {"manager", "auditor_clerk"}
REFRESH_COOKIE_NAME = "pq_refresh_token"
DEFAULT_CUSTOMER_BALANCE = Decimal(os.getenv("DEFAULT_CUSTOMER_BALANCE", "250000.00"))


def _set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=REFRESH_TOKEN_TTL_SECONDS,
        httponly=True,
        secure=True,
        samesite="Strict",
    )


def _clear_refresh_cookie(response):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        "",
        expires=0,
        max_age=0,
        httponly=True,
        secure=True,
        samesite="Strict",
    )


def _abort_if_revoked(certificate_id, *, session_token=None):
    if not certificate_id:
        if session_token:
            destroy_session(session_token)
        return jsonify({"message": "Certificate identifier missing"}), 403

    try:
        revoked = CertificateService.is_revoked(certificate_id)
    except Exception as exc:  # pylint: disable=broad-except
        current_app.logger.error("CRL validation failed: %s", exc)
        if session_token:
            destroy_session(session_token)
        return (
            jsonify(
                {
                    "message": "Unable to verify certificate revocation status",
                    "details": "Revocation authority unavailable",
                }
            ),
            503,
        )

    if revoked:
        if session_token:
            destroy_session(session_token)
        return jsonify({"message": "Certificate revoked"}), 403

    return None


def _legacy_delivery_ciphertext(
    certificate_text, *, kyber_crystal_b64, password, certificate_id
):
    if not certificate_text:
        raise ValueError("certificate_text required for legacy delivery")
    if not kyber_crystal_b64 or not password or not certificate_id:
        raise ValueError("Kyber crystal, password, and certificate_id required")
    try:
        kyber_bytes = base64.b64decode(kyber_crystal_b64)
    except Exception as exc:  # pylint: disable=broad-except
        raise ValueError("Kyber crystal payload invalid") from exc

    material = kyber_bytes + password.encode("utf-8") + certificate_id.encode("utf-8")
    aes_key = hashlib.sha3_256(material).digest()
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, certificate_text.encode("utf-8"), None)
    return {
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "cipher": "AES-256-GCM",
    }


def _format_timestamp(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat() + "Z"
    return value


def _derive_account_number(user_id: str) -> str:
    digest = hashlib.sha1(user_id.encode("utf-8")).hexdigest().upper()
    return f"91-001-{digest[:8]}"


def _ensure_customer_profile(*, user_id: str, full_name: str) -> Customer:
    if not user_id:
        raise ValueError("user_id required to create profile")
    if not full_name:
        raise ValueError("full_name required to create profile")

    account_number = _derive_account_number(user_id)
    profile = Customer.query.get(user_id)

    if profile:
        profile.name = full_name
        if not profile.account_number:
            profile.account_number = account_number
        if profile.status != CustomerStatus.ACTIVE:
            profile.status = CustomerStatus.ACTIVE
    else:
        profile = Customer(
            id=user_id,
            name=full_name,
            account_number=account_number,
            balance=DEFAULT_CUSTOMER_BALANCE,
            status=CustomerStatus.ACTIVE,
        )
        db.session.add(profile)

    db.session.commit()
    return profile


def _ensure_user_record(*, user_id: str, username: str, full_name: str, email: str, role_name: str = "customer") -> User:
    """Create or update User record for admin panel visibility."""
    # Get or create the role
    role = Role.query.filter(func.lower(Role.name) == role_name.lower()).first()
    if not role:
        role = Role(name=role_name)
        db.session.add(role)
        db.session.flush()
    
    # Check if user already exists by customer_id (for customers) or username
    user = User.query.filter_by(customer_id=user_id).first() if role_name.lower() == "customer" else None
    
    # If not found by customer_id, try by username
    if not user:
        user = User.query.filter_by(username=username).first()
    
    # If not found by username, try by old UUID username format
    if not user:
        user = User.query.filter_by(username=user_id).first()
    
    if user:
        # Update existing user
        user.username = username  # Update to proper username if it was UUID
        user.full_name = full_name
        user.email = email
        user.customer_id = user_id if role_name.lower() == "customer" else user.customer_id
        user.role_id = role.id
        user.is_active = True
        if user.mobile is None:
            user.mobile = ""
        if user.address is None:
            user.address = None
        if user.aadhar is None:
            user.aadhar = None
        if user.pan is None:
            user.pan = None
    else:
        # Create new user
        user = User(
            username=username,
            full_name=full_name,
            email=email,
            mobile="",
            address=None,
            aadhar=None,
            pan=None,
            customer_id=user_id if role_name.lower() == "customer" else None,
            role_id=role.id,
            is_active=True,
        )
        db.session.add(user)
    
    db.session.commit()
    return user


# =========================================================
# CUSTOMER REGISTRATION (NO CERTIFICATE UPLOAD)
# =========================================================
@auth_bp.route("/register", methods=["POST"])
def register_customer():
    data = request.get_json(silent=True) or {}

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    client_keys = data.get("client_public_keys") or {}
    rsa_public_key_spki = (client_keys.get("rsa_spki") or "").strip()
    pq_public_key_b64 = (client_keys.get("pq_public_key") or "").strip() or None
    ml_kem_public_key_b64 = (
        client_keys.get("ml_kem_public_key")
        or client_keys.get("kyber_public_key")
        or ""
    ).strip()
    auto_generated_ml_kem = False
    if not ml_kem_public_key_b64:
        auto_generated_ml_kem = True
        keypair = KyberCrystal.generate_keypair()
        ml_kem_public_key_b64 = keypair["public_key"]

    if not full_name or not email:
        return jsonify({"message": "Missing registration data"}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    if not rsa_public_key_spki:
        return jsonify({"message": "Client RSA public key required"}), 400

    requested_device_secret = (data.get("device_secret") or "").strip()
    if requested_device_secret and len(requested_device_secret) < 6:
        return jsonify({"message": "Device secret must be at least 6 characters"}), 400

    user_id = str(uuid.uuid4())
    # Generate username from email (username part before @)
    username = email.split('@')[0] if '@' in email else email[:50]
    device_secret = requested_device_secret or secrets.token_urlsafe(32)

    try:
        cert_bundle = CertificateService.issue_customer_certificate(
            user_id=user_id,
            full_name=full_name,
            role="customer",
            ml_kem_public_key_b64=ml_kem_public_key_b64,
            rsa_public_key_spki=rsa_public_key_spki,
            pq_public_key_b64=pq_public_key_b64,
            device_secret=device_secret,
        )
    except FileNotFoundError as exc:
        return jsonify({"message": str(exc)}), 500
    except Exception as exc:
        return (
            jsonify({"message": "Unable to issue certificate", "details": str(exc)}),
            500,
        )

    delivery_package = CertificateDelivery.encrypt_for_client(
        cert_bundle["certificate_pem"],
        client_mlkem_public_key_b64=ml_kem_public_key_b64,
        certificate_hash=cert_bundle["cert_hash"],
    )

    legacy_kyber_secret = base64.b64encode(os.urandom(48)).decode("ascii")
    legacy_delivery = _legacy_delivery_ciphertext(
        cert_bundle["certificate_pem"],
        kyber_crystal_b64=legacy_kyber_secret,
        password=password,
        certificate_id=user_id,
    )

    try:
        profile = _ensure_customer_profile(user_id=user_id, full_name=full_name)
        # Also create User record for admin panel visibility
        _ensure_user_record(user_id=user_id, username=username, full_name=full_name, email=email, role_name="customer")
    except Exception as exc:  # pylint: disable=broad-except
        db.session.rollback()
        current_app.logger.error("Unable to provision customer account: %s", exc)
        return (
            jsonify({"message": "Customer profile provisioning failed"}),
            500,
        )

    return (
        jsonify(
            {
                "message": "Customer registered successfully",
                "user_id": user_id,
                "certificate_id": user_id,
                "delivery": legacy_delivery,
                "mlkem_delivery": delivery_package,
                "kyber_crystal": legacy_kyber_secret,
                "device_secret": device_secret,
                "crypto": cert_bundle["crypto_suite"],
                "account_number": profile.account_number,
                "ml_kem_public_key": ml_kem_public_key_b64,
                "ml_kem_auto_generated": auto_generated_ml_kem,
            }
        ),
        201,
    )


# =========================================================
# ADMIN / CA ISSUED CERTIFICATES (MANAGER/AUDITOR_CLERK)
# =========================================================
@auth_bp.route("/issue-role-certificate", methods=["POST"])
def issue_role_certificate():
    admin_secret = request.headers.get("X-ADMIN-SECRET")
    expected_secret = current_app.config.get("ADMIN_ISSUER_SECRET")

    if not expected_secret or admin_secret != expected_secret:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json or {}
    role = (data.get("role") or "").strip().lower()
    full_name = data.get("full_name")
    user_id = data.get("user_id") or f"{role}-{uuid.uuid4().hex[:8]}"
    client_keys = data.get("client_public_keys") or {}
    rsa_public_key_spki = (client_keys.get("rsa_spki") or "").strip()
    pq_public_key_b64 = (client_keys.get("pq_public_key") or "").strip() or None
    ml_kem_public_key_b64 = (
        client_keys.get("ml_kem_public_key")
        or client_keys.get("kyber_public_key")
        or ""
    ).strip()
    device_secret = (data.get("device_secret") or "").strip() or secrets.token_urlsafe(
        32
    )

    if role not in ADMIN_MANAGED_ROLES:
        return jsonify({"message": "Role must be manager/auditor_clerk"}), 400

    if not full_name:
        return jsonify({"message": "Full name is required"}), 400

    if not rsa_public_key_spki:
        return jsonify({"message": "Client RSA public key required"}), 400

    if not ml_kem_public_key_b64:
        return jsonify({"message": "Client ML-KEM public key required"}), 400

    try:
        cert_bundle = CertificateService.issue_customer_certificate(
            user_id=user_id,
            full_name=full_name,
            role=role,
            ml_kem_public_key_b64=ml_kem_public_key_b64,
            rsa_public_key_spki=rsa_public_key_spki,
            pq_public_key_b64=pq_public_key_b64,
            device_secret=device_secret,
        )
    except Exception as exc:
        return (
            jsonify({"message": "Unable to issue certificate", "details": str(exc)}),
            500,
        )

    return (
        jsonify(
            {
                "message": f"{role.title()} certificate issued",
                "user_id": user_id,
                "role": role,
                "certificate": cert_bundle["certificate_pem"],
                "crypto": cert_bundle["crypto_suite"],
                "device_secret": device_secret,
                "download_url": f"/api/auth/download-certificate/{user_id}?role={role}",
            }
        ),
        201,
    )


# =========================================================
# CERTIFICATE DOWNLOAD
# =========================================================
@auth_bp.route("/download-certificate/<user_id>", methods=["GET"])
def download_certificate(user_id):
    requested_role = request.args.get("role")
    try:
        cert_text, resolved_role, _ = CertificateService.fetch_certificate_text(
            user_id, requested_role
        )
    except FileNotFoundError:
        return jsonify({"message": "Certificate not found"}), 404
    except CertificateVaultError as exc:
        return (
            jsonify({"message": "Certificate vault unavailable", "details": str(exc)}),
            500,
        )

    filename = f"{user_id}_{resolved_role}.pem"
    buffer = BytesIO(cert_text.encode("utf-8"))
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/x-pem-file",
    )


# =========================================================
# CERTIFICATE CHALLENGE (STEP 1)
# =========================================================
@auth_bp.route("/certificate-challenge", methods=["POST"])
def certificate_challenge():
    payload = request.get_json(silent=True) or {}
    certificate_id = (payload.get("certificate_id") or "").strip()
    device_id = (payload.get("device_id") or "").strip()
    
    current_app.logger.info(f"[DEBUG] certificate_id: {certificate_id}, device_id: {device_id}")

    if not certificate_id or not device_id:
        return jsonify({"message": "certificate_id and device_id are required"}), 400

    try:
        certificate, _ = CertificateService.load_certificate_payload(certificate_id)
        current_app.logger.info(f"[DEBUG] Certificate loaded successfully")
    except FileNotFoundError:
        current_app.logger.error(f"[DEBUG] Certificate not found for ID: {certificate_id}")
        return jsonify({"message": "Certificate not found"}), 404

    try:
        cert_payload = CertificateService.verify_certificate(certificate)
        current_app.logger.info(f"[DEBUG] Certificate verified, user_id: {cert_payload.get('user_id')}")
    except Exception as exc:
        current_app.logger.error(f"[DEBUG] Certificate verification failed: {exc}")
        return jsonify({"message": str(exc)}), 403

    response_payload = {
        "expires_in": 180,
        "role": cert_payload["role"],
        "required_signatures": {
            "rsa": "RSA-3072/SHA-256",
            "pq": CertificateService.PQ_SIGNATURE_ALGO,
        },
    }
    stored_secret = DeviceBindingStore.get_secret(cert_payload["user_id"])
    current_app.logger.info(f"[DEBUG] user_id: {cert_payload['user_id']}, stored_secret exists: {stored_secret is not None}")
    if not stored_secret:
        return jsonify({"message": "Device binding not found"}), 403

    expected_device_id = CertificateService.derive_device_id(stored_secret)
    if expected_device_id != device_id:
        return jsonify({"message": "Device binding mismatch"}), 403

    challenge = ChallengeManager.create_challenge(
        cert_payload,
        ttl_seconds=180,
        purpose="certificate_login",
        metadata={"device_id": device_id},
        binding_context={
            "device_id": device_id,
        },
        legacy_device_secret=stored_secret,
    )

    response_payload.update(
        {
            "challenge_token": challenge["token"],
            "nonce": base64.b64encode(challenge["nonce"]).decode("utf-8"),
        }
    )
    return jsonify(response_payload)


# =========================================================
# QR ID CARD CHALLENGE (IDENTITY VIA QR CODE)
# =========================================================
@auth_bp.route("/qr-challenge", methods=["POST"])
def qr_identity_challenge():
    payload = request.get_json(silent=True) or {}
    certificate_id = (payload.get("certificate_id") or "").strip()
    cert_hash = (payload.get("cert_hash") or "").strip()

    if not certificate_id or not cert_hash:
        return (
            jsonify(
                {
                    "message": "certificate_id and cert_hash are required",
                }
            ),
            400,
        )

    certificate, error = _load_verified_certificate(certificate_id, cert_hash)
    if error:
        return error

    revocation_error = _abort_if_revoked(certificate.get("certificate_id"))
    if revocation_error:
        return revocation_error

    user_id = certificate.get("user_id")
    device_secret = DeviceBindingStore.get_secret(user_id)
    if not device_secret:
        return jsonify({"message": "Device binding not found"}), 403

    ttl_seconds = 180
    nonce = secrets.token_bytes(32)
    metadata = {
        "cert_hash": certificate.get("cert_hash"),
    }
    response_payload = {
        "expires_in": ttl_seconds,
        "challenge_alg": CertificateService.CHALLENGE_ALG,
    }

    device_id = CertificateService.derive_device_id(device_secret)

    challenge = ChallengeManager.create_challenge(
        certificate,
        ttl_seconds=ttl_seconds,
        purpose="qr_login",
        metadata={**metadata, "device_id": device_id},
        binding_context={
            "device_id": device_id,
        },
        legacy_device_secret=device_secret,
        nonce=nonce,
    )

    response_payload.update(
        {
            "challenge_token": challenge["token"],
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "device_id": device_id,
            "binding_mode": "device_secret",
        }
    )
    return jsonify(response_payload)


# =========================================================
# CERTIFICATE-BASED LOGIN (STEP 2)
# =========================================================
def _load_verified_certificate(certificate_id: str, cert_hash: Optional[str] = None):
    if not certificate_id:
        return None, (
            jsonify({"message": "certificate_id is required"}),
            400,
        )
    try:
        stored_certificate, _ = CertificateService.load_certificate_payload(
            certificate_id
        )
    except FileNotFoundError:
        return None, (
            jsonify({"message": "Certificate not found"}),
            404,
        )

    try:
        verified_certificate = CertificateService.verify_certificate(stored_certificate)
    except Exception as exc:  # pylint: disable=broad-except
        return None, (
            jsonify({"message": str(exc)}),
            403,
        )

    if cert_hash and verified_certificate.get("cert_hash") != cert_hash:
        return None, (
            jsonify({"message": "Certificate hash mismatch"}),
            403,
        )

    return verified_certificate, None


@auth_bp.route("/qr-login", methods=["POST"])
def qr_certificate_login():
    data = request.get_json(silent=True) or {}
    challenge_token = (data.get("challenge_token") or "").strip()
    device_id = (data.get("device_id") or "").strip()
    device_proof = (data.get("device_proof") or "").strip()
    rsa_signature = data.get("rsa_signature")
    pq_signature = data.get("pq_signature")

    if not challenge_token or not device_id or not rsa_signature or not device_proof:
        return (
            jsonify(
                {
                    "message": "challenge_token, device_id, device_proof, and rsa_signature are required",
                }
            ),
            400,
        )

    challenge = ChallengeManager.consume(challenge_token)
    if not challenge:
        return jsonify({"message": "Challenge expired or invalid"}), 410

    if challenge.get("purpose") not in {"qr_login"}:
        return jsonify({"message": "Challenge not valid for QR login"}), 403

    metadata = challenge.get("metadata") or {}
    binding_context = challenge.get("binding") or {}
    certificate_stub = challenge.get("certificate") or {}
    expected_device_id = metadata.get("device_id")
    if expected_device_id and expected_device_id != device_id:
        return jsonify({"message": "Device binding mismatch"}), 403

    certificate, load_error = _load_verified_certificate(
        certificate_stub.get("certificate_id"), metadata.get("cert_hash")
    )
    if load_error:
        return load_error

    revocation_error = _abort_if_revoked(certificate.get("certificate_id"))
    if revocation_error:
        return revocation_error

    challenge_nonce = challenge["nonce"]
    message = CertificateService.build_client_challenge_message(
        challenge_nonce, device_id
    )

    stored_secret = binding_context.get("legacy_secret")
    if not stored_secret:
        return jsonify({"message": "Device binding data missing"}), 403

    derived_device_id = CertificateService.derive_device_id(stored_secret)
    if derived_device_id != device_id:
        return jsonify({"message": "Device binding mismatch"}), 403

    if not device_proof:
        return jsonify({"message": "Device proof required"}), 400

    expected_proof = CertificateService.compute_device_proof_legacy(
        stored_secret, challenge_nonce
    )
    if expected_proof != device_proof:
        return jsonify({"message": "Device challenge failed"}), 403

    try:
        CertificateService.verify_client_rsa_signature(
            certificate,
            message,
            rsa_signature,
        )
        CertificateService.verify_client_pq_signature(
            certificate,
            message,
            pq_signature,
        )
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"message": str(exc)}), 403

    account_number = None
    if certificate.get("role") == "customer":
        profile = Customer.query.get(certificate["user_id"])
        if not profile:
            profile = _ensure_customer_profile(
                user_id=certificate["user_id"],
                full_name=certificate["owner"],
            )
        account_number = profile.account_number

    # Fetch user details from database
    # For customers, try to find by customer_id first
    user_record = None
    if certificate.get("role") == "customer":
        user_record = User.query.filter_by(customer_id=certificate["user_id"]).first()
    
    # If not found, try by integer ID (for non-customer users)
    if not user_record:
        user_record = User.query.get(certificate["user_id"]) if certificate["user_id"].isdigit() else None
    
    # If still not found, try by username (fallback)
    if not user_record:
        potential_username = certificate["owner"].lower().replace(" ", "_")
        user_record = User.query.filter_by(username=potential_username).first()
        
        # Also try finding by email if username doesn't match
        if not user_record and certificate.get("email"):
            user_record = User.query.filter_by(email=certificate["email"]).first()
    
    access_token = str(uuid.uuid4())
    refresh_token = str(uuid.uuid4())

    session_user_payload = {
        "id": certificate["user_id"],
        "name": certificate["owner"],
        "role": certificate["role"],
    }
    
    # Add additional user details if available
    if user_record:
        session_user_payload["full_name"] = user_record.full_name
        session_user_payload["username"] = user_record.username
        session_user_payload["email"] = user_record.email
    else:
        # Use certificate owner name only, no dummy email
        session_user_payload["full_name"] = certificate["owner"]
        session_user_payload["username"] = certificate["owner"].lower().replace(" ", "_")
        session_user_payload["email"] = None  # No email if user record doesn't exist
    
    if account_number:
        session_user_payload["account_number"] = account_number

    create_session(
        access_token,
        session_user_payload,
        certificate,
        binding={
            "device_id": device_id,
            "cert_hash": certificate.get("cert_hash"),
            "role": certificate.get("role"),
        },
        refresh_token=refresh_token,
    )

    origin_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    origin_city = request.headers.get("X-Client-City")
    origin_country = request.headers.get("X-Client-Country")

    device_label = request.headers.get("X-Device-Label")
    if not device_label and request.user_agent:
        device_label = request.user_agent.string
    if device_label:
        device_label = device_label[:160]

    AccountabilityStore.record_event(
        certificate=certificate,
        intent="qr_certificate_login",
        authority=certificate.get("role"),
        origin={
            "ip": origin_ip,
            "city": origin_city,
            "country": origin_country,
        },
        metadata={
            "session_token": access_token,
            "device_id": device_id,
            "challenge_token": challenge_token,
        },
    )

    response = jsonify(
        {
            "message": "QR login successful",
            "token": access_token,
            "token_expires_in": ACCESS_TOKEN_TTL_SECONDS,
            "refresh_endpoint": REFRESH_ENDPOINT,
            "user": {
                "id": certificate["user_id"],
                "name": certificate["owner"],
                "role": certificate["role"],
                "allowed_actions": certificate.get("allowed_actions", []),
                "account_number": account_number,
            },
            "security": {
                "classical": "RSA-3072 client signature verified",
                "post_quantum": (
                    "Dilithium client signature verified"
                    if pq_signature
                    else "Dilithium signature not provided"
                ),
                "mode": "QR-bound Hybrid PKI",
                "valid_to": certificate.get("valid_to"),
                "lineage": certificate.get("lineage_id"),
                "challenge_alg": CertificateService.CHALLENGE_ALG,
                "crl_url": certificate.get("crl_url"),
            },
        }
    )
    _set_refresh_cookie(response, refresh_token)
    return response


@auth_bp.route("/certificate-login", methods=["POST"])
def certificate_login():
    data = request.get_json(silent=True) or {}
    challenge_token = data.get("challenge_token")
    device_id = data.get("device_id")
    rsa_signature = data.get("rsa_signature")
    pq_signature = data.get("pq_signature")
    device_proof = data.get("device_proof")

    if not all([challenge_token, device_id, rsa_signature, device_proof]):
        return jsonify({"message": "Missing login artifacts"}), 400

    challenge = ChallengeManager.consume(challenge_token)
    if not challenge:
        return jsonify({"message": "Challenge expired or invalid"}), 410

    certificate = challenge["certificate"]
    metadata = challenge.get("metadata", {})
    binding_context = challenge.get("binding", {})
    expected_device_id = metadata.get("device_id")

    stored_secret = binding_context.get("legacy_secret")
    if not stored_secret:
        return jsonify({"message": "Device binding data missing"}), 403

    derived_device_id = CertificateService.derive_device_id(stored_secret)
    if derived_device_id != device_id or derived_device_id != expected_device_id:
        return jsonify({"message": "Device binding mismatch"}), 403

    expected_proof = CertificateService.compute_device_proof_legacy(
        stored_secret, challenge["nonce"]
    )
    if expected_proof != device_proof:
        return jsonify({"message": "Device challenge failed"}), 403

    message = CertificateService.build_client_challenge_message(
        challenge["nonce"], device_id
    )

    try:
        canonical_certificate, _ = CertificateService.load_certificate_payload(
            certificate["certificate_id"], certificate.get("role")
        )
        certificate = CertificateService.verify_certificate(canonical_certificate)
    except FileNotFoundError:
        return jsonify({"message": "Certificate record not found"}), 403
    except Exception as exc:  # pylint: disable=broad-except
        return (
            jsonify(
                {
                    "message": "Certificate verification failed",
                    "details": str(exc),
                }
            ),
            403,
        )

    try:
        CertificateService.verify_client_rsa_signature(
            certificate, message, rsa_signature
        )
        CertificateService.verify_client_pq_signature(
            certificate, message, pq_signature
        )
    except Exception as exc:
        return jsonify({"message": str(exc)}), 403

    account_number = None
    if certificate.get("role") == "customer":
        profile = Customer.query.get(certificate["user_id"])
        if not profile:
            profile = _ensure_customer_profile(
                user_id=certificate["user_id"], full_name=certificate["owner"]
            )
        account_number = profile.account_number

    # Fetch user details from database
    # For customers, try to find by customer_id first
    user_record = None
    if certificate.get("role") == "customer":
        user_record = User.query.filter_by(customer_id=certificate["user_id"]).first()
    
    # If not found, try by integer ID (for non-customer users)
    if not user_record:
        user_record = User.query.get(certificate["user_id"]) if certificate["user_id"].isdigit() else None
    
    # If still not found, try by username (fallback)
    if not user_record:
        potential_username = certificate["owner"].lower().replace(" ", "_")
        user_record = User.query.filter_by(username=potential_username).first()
        
        # Also try finding by email if username doesn't match
        if not user_record and certificate.get("email"):
            user_record = User.query.filter_by(email=certificate["email"]).first()

    access_token = str(uuid.uuid4())
    refresh_token = str(uuid.uuid4())

    session_user_payload = {
        "id": certificate["user_id"],
        "name": certificate["owner"],
        "role": certificate["role"],
    }
    
    # Add additional user details if available
    if user_record:
        session_user_payload["full_name"] = user_record.full_name
        session_user_payload["username"] = user_record.username
        session_user_payload["email"] = user_record.email
    else:
        # Use certificate owner name only, no dummy email
        session_user_payload["full_name"] = certificate["owner"]
        session_user_payload["username"] = certificate["owner"].lower().replace(" ", "_")
        session_user_payload["email"] = None  # No email if user record doesn't exist
    
    if account_number:
        session_user_payload["account_number"] = account_number

    create_session(
        access_token,
        session_user_payload,
        certificate,
        binding={
            "device_id": device_id,
            "cert_hash": certificate.get("cert_hash"),
            "role": certificate.get("role"),
        },
        refresh_token=refresh_token,
    )

    origin_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    origin_city = request.headers.get("X-Client-City")
    origin_country = request.headers.get("X-Client-Country")

    header_device_label = request.headers.get("X-Device-Label")
    if header_device_label:
        device_label = header_device_label.strip()
    elif request.user_agent:
        device_label = request.user_agent.string
    else:
        device_label = None

    if device_label:
        device_label = device_label[:160]

    AccountabilityStore.record_event(
        certificate=certificate,
        intent="certificate_login",
        authority=certificate["role"],
        origin={
            "ip": origin_ip,
            "city": origin_city,
            "country": origin_country,
        },
        metadata={
            "session_token": access_token,
            "device_id": device_id,
            "device_label": device_label,
        },
    )

    response = jsonify(
        {
            "message": "Login successful",
            "token": access_token,
            "token_expires_in": ACCESS_TOKEN_TTL_SECONDS,
            "refresh_endpoint": REFRESH_ENDPOINT,
            "user": {
                "id": certificate["user_id"],
                "name": certificate["owner"],
                "role": certificate["role"],
                "allowed_actions": certificate.get("allowed_actions", []),
                "account_number": account_number,
            },
            "security": {
                "classical": "RSA-3072 client signature verified",
                "post_quantum": "Dilithium client signature verified",
                "mode": "Hybrid PKI",
                "valid_to": certificate.get("valid_to"),
                "lineage": certificate.get("lineage_id"),
                "challenge_alg": CertificateService.CHALLENGE_ALG,
                "crl_url": certificate.get("crl_url"),
            },
        }
    )
    _set_refresh_cookie(response, refresh_token)
    return response


def _extract_session_from_header(
    *, allow_expired_access: bool = False, revalidate_certificate: bool = False
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None, (jsonify({"message": "Missing Authorization header"}), 401)
    token = auth_header.replace("Bearer ", "", 1).strip()
    session, state_error = enforce_session_state(
        token, allow_expired_access=allow_expired_access
    )
    if state_error:
        return None, state_error

    if revalidate_certificate:
        _, validation_error = validate_session_certificate(token, session)
        if validation_error:
            return None, validation_error

    return (token, session), None


@auth_bp.route("/verify-session", methods=["GET"])
@require_certificate()
def verify_session():
    session = getattr(request, "session", {}) or {}
    certificate = session.get("certificate") or {}
    session_user = session.get("user") or {}
    token = getattr(request, "session_token", "").strip()

    account_number = session_user.get("account_number")
    if (
        not account_number
        and session_user.get("role") == "customer"
        and session_user.get("id")
    ):
        profile = Customer.query.get(session_user["id"])
        if profile:
            account_number = profile.account_number
            session_user["account_number"] = account_number

    revocation_error = _abort_if_revoked(certificate.get("certificate_id"))
    if revocation_error:
        return revocation_error

    if token:
        mark_session_verified(token)

    return jsonify(
        {
            "user": {
                "id": session_user.get("id"),
                "name": session_user.get("name"),
                "role": session_user.get("role"),
                "allowed_actions": certificate.get("allowed_actions", []),
                "account_number": account_number,
            },
            "certificate": {
                "certificate_id": certificate.get("certificate_id"),
                "serial_number": certificate.get("serial_number"),
                "lineage_id": certificate.get("lineage_id"),
                "valid_to": certificate.get("valid_to"),
                "crl_url": certificate.get("crl_url"),
            },
            "session": {
                "reauth_required": session_requires_reauth(token),
                "created_at": _format_timestamp(session.get("created_at")),
                "last_verified": _format_timestamp(session.get("last_verified")),
                "reauth_deadline": _format_timestamp(session.get("reauth_deadline")),
            },
        }
    )


@auth_bp.route("/session-rechallenge", methods=["POST"])
def session_rechallenge():
    session_tuple, error = _extract_session_from_header(revalidate_certificate=True)
    if error:
        return error
    token, session = session_tuple

    user = session["user"]
    certificate = session.get("certificate") or {}
    user_id = user["id"]

    revocation_error = _abort_if_revoked(
        certificate.get("certificate_id"), session_token=token
    )
    if revocation_error:
        return revocation_error

    response_payload = {
        "expires_in": 180,
        "reauth_required": session_requires_reauth(token),
        "required_signatures": {
            "rsa": "RSA-3072/SHA-256",
            "pq": CertificateService.PQ_SIGNATURE_ALGO,
        },
    }
    device_secret = DeviceBindingStore.get_secret(user_id)
    if not device_secret:
        return jsonify({"message": "Device binding not found"}), 403

    device_id = CertificateService.derive_device_id(device_secret)

    challenge = ChallengeManager.create_challenge(
        certificate,
        ttl_seconds=180,
        purpose="session_rechallenge",
        metadata={"session_token": token, "device_id": device_id},
        binding_context={
            "device_id": device_id,
        },
        legacy_device_secret=device_secret,
    )

    response_payload.update(
        {
            "challenge_token": challenge["token"],
            "nonce": base64.b64encode(challenge["nonce"]).decode("utf-8"),
            "device_id": device_id,
        }
    )
    return jsonify(response_payload)


@auth_bp.route("/session-reverify", methods=["POST"])
def session_reverify():
    session_tuple, error = _extract_session_from_header(revalidate_certificate=True)
    if error:
        return error
    token, session = session_tuple

    data = request.get_json(silent=True) or {}
    challenge_token = data.get("challenge_token")
    device_id = (data.get("device_id") or "").strip()
    rsa_signature = data.get("rsa_signature")
    pq_signature = data.get("pq_signature")
    device_proof = data.get("device_proof")

    if not challenge_token or not device_id or not rsa_signature or not device_proof:
        return (
            jsonify(
                {
                    "message": "challenge_token, device_id, device_proof, and rsa_signature are required",
                }
            ),
            400,
        )

    challenge = ChallengeManager.consume(challenge_token)
    if not challenge:
        return jsonify({"message": "Challenge expired or invalid"}), 410

    certificate = session.get("certificate") or {}
    if challenge["certificate"].get("certificate_id") != certificate.get(
        "certificate_id"
    ):
        destroy_session(token)
        return jsonify({"message": "Challenge does not match active session"}), 403

    metadata = challenge.get("metadata") or {}
    binding_context = challenge.get("binding") or {}
    bound_token = metadata.get("session_token")
    if bound_token and bound_token != token:
        destroy_session(token)
        return jsonify({"message": "Challenge token bound to different session"}), 403

    expected_device_id = metadata.get("device_id") or binding_context.get("device_id")
    if expected_device_id and device_id != expected_device_id:
        destroy_session(token)
        return jsonify({"message": "Device binding mismatch"}), 403

    challenge_nonce = challenge["nonce"]
    message = CertificateService.build_client_challenge_message(
        challenge_nonce, device_id
    )

    stored_secret = binding_context.get("legacy_secret")
    if not stored_secret:
        destroy_session(token)
        return jsonify({"message": "Device binding data missing"}), 403

    derived_device_id = CertificateService.derive_device_id(stored_secret)
    if derived_device_id != device_id or (
        expected_device_id and derived_device_id != expected_device_id
    ):
        destroy_session(token)
        return jsonify({"message": "Device binding mismatch"}), 403

    expected_proof = CertificateService.compute_device_proof_legacy(
        stored_secret, challenge_nonce
    )

    if expected_proof != device_proof:
        destroy_session(token)
        return jsonify({"message": "Device challenge failed"}), 403

    revocation_error = _abort_if_revoked(
        certificate.get("certificate_id"), session_token=token
    )
    if revocation_error:
        return revocation_error

    try:
        CertificateService.verify_client_rsa_signature(
            certificate, message, rsa_signature
        )
        CertificateService.verify_client_pq_signature(
            certificate, message, pq_signature
        )
    except Exception as exc:  # pylint: disable=broad-except
        destroy_session(token)
        return jsonify({"message": str(exc)}), 403

    mark_session_verified(token)
    return jsonify(
        {
            "message": "Session re-authenticated",
            "reauthenticated_at": datetime.utcnow().replace(microsecond=0).isoformat()
            + "Z",
        }
    )


@auth_bp.route("/session-key", methods=["POST"])
def establish_session_key():
    session_tuple, error = _extract_session_from_header(revalidate_certificate=True)
    if error:
        return error
    token, session = session_tuple
    certificate = session.get("certificate") or {}
    cert_hash = (certificate.get("cert_hash") or "").strip()
    if not cert_hash:
        destroy_session(token)
        return jsonify({"message": "Certificate hash unavailable for session"}), 503

    payload = request.get_json(silent=True) or {}
    ml_kem_public_key_b64 = (payload.get("ml_kem_public_key") or "").strip()
    if not ml_kem_public_key_b64:
        return jsonify({"message": "ml_kem_public_key is required"}), 400

    try:
        kem_payload = KyberCrystal.encapsulate(ml_kem_public_key_b64)
        shared_secret = KyberCrystal.shared_secret_to_bytes(
            kem_payload["shared_secret"]
        )
        aes_key = KyberCrystal.derive_session_aes_key(shared_secret, cert_hash)
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    except Exception as exc:  # pylint: disable=broad-except
        current_app.logger.error("Session key derivation failed: %s", exc)
        return jsonify({"message": "Unable to derive session key"}), 500

    key_id = secrets.token_urlsafe(16)
    derived_at = datetime.utcnow()
    expires_at = derived_at + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)
    session_keys = session.setdefault("session_keys", {})
    session_keys[key_id] = {
        "alg": "AES-256-GCM",
        "key_b64": base64.b64encode(aes_key).decode("ascii"),
        "derived_at": derived_at,
        "expires_at": expires_at,
    }

    return jsonify(
        {
            "message": "Session key established",
            "key": {
                "key_id": key_id,
                "alg": "AES-256-GCM",
                "derived_at": derived_at.replace(microsecond=0).isoformat() + "Z",
                "expires_at": expires_at.replace(microsecond=0).isoformat() + "Z",
                "encapsulation": {
                    "alg": KyberCrystal.ALG_NAME,
                    "ciphertext": kem_payload["ciphertext"],
                },
                "kdf": {
                    "alg": "HKDF-SHA3-256",
                    "ikm": "shared_secret||certificate_hash",
                },
            },
        }
    )


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session_tuple, error = _extract_session_from_header(allow_expired_access=True)
    if error:
        error_response, status = error
        _clear_refresh_cookie(error_response)
        return error_response, status

    token, _ = session_tuple
    destroy_session(token)
    response = jsonify({"message": "Logged out"})
    _clear_refresh_cookie(response)
    return response


@auth_bp.route("/refresh", methods=["POST"])
def refresh_session():
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        return jsonify({"message": "Refresh token missing"}), 401

    new_access_token = str(uuid.uuid4())
    new_refresh_token = str(uuid.uuid4())
    session = refresh_session_tokens(
        refresh_token,
        new_access_token=new_access_token,
        new_refresh_token=new_refresh_token,
    )
    if not session:
        response = jsonify({"message": "Refresh token invalid or expired"})
        _clear_refresh_cookie(response)
        return response, 401

    verified_certificate, validation_error = validate_session_certificate(
        new_access_token, session
    )
    if validation_error:
        response, status_code = validation_error
        _clear_refresh_cookie(response)
        return response, status_code

    revocation_error = _abort_if_revoked(
        (verified_certificate or {}).get("certificate_id"),
        session_token=new_access_token,
    )
    if revocation_error:
        response, status_code = revocation_error
        _clear_refresh_cookie(response)
        return response, status_code

    response = jsonify(
        {
            "message": "Token refreshed",
            "token": new_access_token,
            "token_expires_in": ACCESS_TOKEN_TTL_SECONDS,
            "refresh_endpoint": REFRESH_ENDPOINT,
            "user": session.get("user"),
        }
    )
    _set_refresh_cookie(response, new_refresh_token)
    return response
