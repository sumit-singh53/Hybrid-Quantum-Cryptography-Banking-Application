import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

from app.services.certificate_service import CertificateService
from app.security.device_binding_store import DeviceBindingStore
from app.security.request_audit_store import RequestAuditStore
from app.security.security_event_store import SecurityEventStore

# Temporary in-memory token store (later you can replace with JWT / Redis)
ACTIVE_SESSIONS = {}
REFRESH_INDEX = {}

# Banking Role Hierarchy
ROLE_HIERARCHY = {
    "customer": 1,
    "manager": 2,
    "auditor_clerk": 3,
    "system_admin": 4,
}

CONTINUOUS_AUTH_INTERVAL_SECONDS = int(
    os.getenv("CONTINUOUS_AUTH_INTERVAL_SECONDS", "600")
)
CONTINUOUS_AUTH_ENDPOINT = "/api/auth/session-rechallenge"
REFRESH_ENDPOINT = "/api/auth/refresh"

ACCESS_TOKEN_TTL_SECONDS = 15 * 60  # 15 minutes
REFRESH_TOKEN_TTL_SECONDS = 8 * 60 * 60  # 8 hours
ABSOLUTE_SESSION_LIMIT_SECONDS = 8 * 60 * 60  # 8 hours
IDLE_TIMEOUT_SECONDS = 15 * 60  # 15 minutes


def _record_security_event(event_type, *, certificate=None, metadata=None):
    try:
        SecurityEventStore.record(
            event_type=event_type,
            certificate_id=(certificate or {}).get("certificate_id"),
            user_id=(certificate or {}).get("user_id"),
            role=(certificate or {}).get("role"),
            metadata=metadata or {},
        )
    except Exception as exc:  # pylint: disable=broad-except
        current_app.logger.warning("Security event log failure: %s", exc)


def _next_deadline(now: datetime) -> datetime:
    if CONTINUOUS_AUTH_INTERVAL_SECONDS <= 0:
        return now
    return now + timedelta(seconds=CONTINUOUS_AUTH_INTERVAL_SECONDS)


def _is_reauth_due(session: dict) -> bool:
    if CONTINUOUS_AUTH_INTERVAL_SECONDS <= 0:
        return False
    deadline = session.get("reauth_deadline")
    if not deadline:
        return False
    return datetime.utcnow() >= deadline


def create_session(token, user, certificate, *, binding, refresh_token):
    now = datetime.utcnow()
    binding_context = {
        "device_id": (binding or {}).get("device_id"),
        "cert_hash": (binding or {}).get("cert_hash"),
        "role": ((binding or {}).get("role") or user.get("role", "")).lower(),
    }
    if not binding_context["device_id"] or not binding_context["cert_hash"]:
        raise ValueError("Session binding requires device_id and cert_hash")
    ACTIVE_SESSIONS[token] = {
        "token": token,
        "user": user,
        "certificate": certificate,
        "created_at": now,
        "last_verified": now,
        "last_activity": now,
        "reauth_deadline": _next_deadline(now),
        "access_expires_at": now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS),
        "absolute_deadline": now + timedelta(seconds=ABSOLUTE_SESSION_LIMIT_SECONDS),
        "refresh_token": refresh_token,
        "refresh_expires_at": now + timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS),
        "binding": binding_context,
    }
    REFRESH_INDEX[refresh_token] = token


def mark_session_verified(token: str) -> None:
    session = ACTIVE_SESSIONS.get(token)
    if not session:
        return
    now = datetime.utcnow()
    session["last_verified"] = now
    session["reauth_deadline"] = _next_deadline(now)
    session["last_activity"] = now


def get_session(token):
    return ACTIVE_SESSIONS.get(token)


def session_requires_reauth(token: str) -> bool:
    session = get_session(token)
    if not session:
        return True
    return _is_reauth_due(session)


def destroy_session(token: str) -> None:
    if not token:
        return
    session = ACTIVE_SESSIONS.pop(token, None)
    if session:
        refresh_token = session.get("refresh_token")
        if refresh_token:
            REFRESH_INDEX.pop(refresh_token, None)


def enforce_session_state(token: str, *, allow_expired_access: bool = False):
    session = get_session(token)
    if not session:
        return None, (jsonify({"message": "Invalid or expired session"}), 401)

    now = datetime.utcnow()

    if now >= session.get("absolute_deadline", now):
        destroy_session(token)
        return (
            None,
            (jsonify({"message": "Session expired"}), 401),
        )

    last_activity = session.get("last_activity") or session.get("created_at")
    if (
        IDLE_TIMEOUT_SECONDS > 0
        and last_activity
        and (now - last_activity).total_seconds() >= IDLE_TIMEOUT_SECONDS
    ):
        destroy_session(token)
        return (
            None,
            (jsonify({"message": "Session timed out due to inactivity"}), 401),
        )

    if not allow_expired_access and now >= session.get("access_expires_at", now):
        return (
            None,
            (
                jsonify(
                    {
                        "message": "Access token expired",
                        "refresh_endpoint": REFRESH_ENDPOINT,
                    }
                ),
                401,
            ),
        )

    session["last_activity"] = now
    return session, None


def get_session_by_refresh_token(refresh_token: str):
    access_token = REFRESH_INDEX.get(refresh_token)
    if not access_token:
        return None, None
    return access_token, ACTIVE_SESSIONS.get(access_token)


def refresh_session_tokens(
    refresh_token: str, *, new_access_token: str, new_refresh_token: str
):
    access_token, session = get_session_by_refresh_token(refresh_token)
    if not session:
        return None

    now = datetime.utcnow()
    if now >= session.get("absolute_deadline", now):
        destroy_session(access_token)
        return None
    if now >= session.get("refresh_expires_at", now):
        destroy_session(access_token)
        return None

    REFRESH_INDEX.pop(refresh_token, None)
    ACTIVE_SESSIONS.pop(access_token, None)

    session["token"] = new_access_token
    session["refresh_token"] = new_refresh_token
    session["access_expires_at"] = now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)
    session["refresh_expires_at"] = now + timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS)
    session["last_activity"] = now
    session["reauth_deadline"] = _next_deadline(now)

    ACTIVE_SESSIONS[new_access_token] = session
    REFRESH_INDEX[new_refresh_token] = new_access_token
    return session


def validate_session_certificate(token: str, session: dict):
    certificate = (session.get("certificate") or {}).copy()
    if not certificate:
        destroy_session(token)
        return None, (jsonify({"message": "Certificate context missing"}), 403)

    certificate_id = certificate.get("certificate_id")
    if not certificate_id:
        destroy_session(token)
        return None, (jsonify({"message": "Certificate missing identifier"}), 403)

    try:
        stored_certificate, _ = CertificateService.load_certificate_payload(
            certificate_id, certificate.get("role")
        )
        verified_certificate = CertificateService.verify_certificate(stored_certificate)
    except FileNotFoundError:
        destroy_session(token)
        return None, (jsonify({"message": "Certificate record not found"}), 403)
    except Exception as exc:  # pylint: disable=broad-except
        destroy_session(token)
        return (
            None,
            (
                jsonify(
                    {
                        "message": "Certificate verification failed",
                        "details": str(exc),
                    }
                ),
                403,
            ),
        )

    binding = session.get("binding") or {}
    binding_role = (binding.get("role") or "").lower()
    binding_hash = binding.get("cert_hash")
    binding_device_id = binding.get("device_id")

    binding_user_id = verified_certificate.get("user_id")
    stored_secret = DeviceBindingStore.get_secret(binding_user_id)
    if not stored_secret:
        destroy_session(token)
        return None, (jsonify({"message": "Device binding not found"}), 403)
    expected_device_id = CertificateService.derive_device_id(stored_secret)

    if not binding_role or not binding_hash or not binding_device_id:
        destroy_session(token)
        return None, (jsonify({"message": "Session binding incomplete"}), 401)

    if binding_role != (verified_certificate.get("role") or "").lower():
        destroy_session(token)
        return None, (
            jsonify({"message": "Role not authorized for this resource"}),
            403,
        )

    if binding_hash != verified_certificate.get("cert_hash"):
        destroy_session(token)
        return None, (jsonify({"message": "Certificate updated since login"}), 403)

    if binding_device_id != expected_device_id:
        _record_security_event(
            "device_mismatch",
            certificate=verified_certificate,
            metadata={
                "binding_device_id": binding_device_id,
                "expected_device_id": expected_device_id,
                "context": "session_validation",
            },
        )
        destroy_session(token)
        return None, (jsonify({"message": "Device binding mismatch"}), 403)

    session.setdefault("binding", {})["device_id"] = expected_device_id
    session["certificate"] = verified_certificate
    return verified_certificate, None


# =========================================
# Authorization Decorator
# =========================================


def _normalize_action_set(actions):
    if not actions:
        return set()
    if isinstance(actions, str):
        items = [actions]
    else:
        items = list(actions)
    return {item.strip().upper() for item in items if item}


def _normalize_role_requirements(required_role):
    if not required_role:
        return set()
    if isinstance(required_role, (list, tuple, set)):
        roles = required_role
    else:
        roles = [required_role]
    return {str(role).strip().lower() for role in roles if role}


def require_certificate(
    required_role=None, *, allowed_actions=None, action_match="all"
):
    """Re-verify certificate integrity, revocation, role, and action scope."""

    required_actions = _normalize_action_set(allowed_actions)
    action_match_mode = (action_match or "all").lower()
    if action_match_mode not in {"all", "any"}:
        raise ValueError("action_match must be 'all' or 'any'")
    required_roles = _normalize_role_requirements(required_role)

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            testing_bypass_enabled = (
                current_app
                and current_app.testing
                and current_app.config.get("TESTING_BYPASS_CERTIFICATE", False)
            )

            if testing_bypass_enabled:
                header_actions = request.headers.get("X-Test-Actions", "")
                header_action_set = {
                    action.strip().upper()
                    for action in header_actions.split(",")
                    if action.strip()
                }
                certificate_actions = (
                    header_action_set or required_actions or {"TEST_BYPASS"}
                )

                resolved_role = request.headers.get("X-Test-Role") or next(
                    iter(required_roles), "customer"
                )
                resolved_role = resolved_role.strip().lower()

                user_id = request.headers.get("X-Test-User-Id", "test-user")
                user_name = request.headers.get("X-Test-User-Name", "Test Harness")

                request.user = {
                    "id": user_id,
                    "name": user_name,
                    "role": resolved_role,
                }
                request.session = {"user": request.user, "bypass": True}
                request.certificate = {
                    "certificate_id": request.headers.get(
                        "X-Test-Certificate-Id", "test-certificate"
                    ),
                    "user_id": user_id,
                    "owner": user_name,
                    "role": resolved_role,
                    "allowed_actions": list(certificate_actions),
                }
                request.allowed_actions = certificate_actions
                request.session_token = "testing-bypass"
                return f(*args, **kwargs)

            auth_header = request.headers.get("Authorization")
            if not auth_header:
                return jsonify({"message": "Missing Authorization header"}), 401

            token = auth_header.replace("Bearer ", "").strip()
            session, state_error = enforce_session_state(token)
            if state_error:
                return state_error

            verified_certificate, validation_error = validate_session_certificate(
                token, session
            )
            if validation_error:
                return validation_error

            certificate_id = verified_certificate.get("certificate_id")
            if CertificateService.is_revoked(certificate_id):
                return jsonify({"message": "Certificate revoked"}), 403

            binding_context = session.get("binding") or {}
            audit_action = (
                request.headers.get("X-Audit-Action") or request.endpoint or f.__name__
            )
            try:
                RequestAuditStore.record_request(
                    certificate=verified_certificate,
                    device_id=binding_context.get("device_id"),
                    action_name=audit_action,
                    method=request.method,
                    path=request.path,
                )
            except Exception as exc:  # pylint: disable=broad-except
                current_app.logger.error("Request audit log failure: %s", exc)

            if _is_reauth_due(session):
                return (
                    jsonify(
                        {
                            "message": "Continuous authentication required",
                            "reauth_endpoint": CONTINUOUS_AUTH_ENDPOINT,
                        }
                    ),
                    440,
                )

            session_user = session.get("user") or {}
            cert_role = (verified_certificate.get("role") or "").lower()
            if required_roles and cert_role not in required_roles:
                return (
                    jsonify({"message": "Role not authorized for this resource"}),
                    403,
                )

            certificate_actions = _normalize_action_set(
                verified_certificate.get("allowed_actions")
            )
            if required_actions:
                has_required = (
                    certificate_actions.issuperset(required_actions)
                    if action_match_mode == "all"
                    else bool(certificate_actions.intersection(required_actions))
                )
                if not has_required:
                    return (
                        jsonify(
                            {
                                "message": "Certificate lacks required authorization",
                                "required_actions": sorted(required_actions),
                            }
                        ),
                        403,
                    )

            request.user = session_user or {
                "id": verified_certificate.get("user_id"),
                "name": verified_certificate.get("owner"),
                "role": cert_role,
            }
            request.session = session
            request.certificate = verified_certificate
            request.allowed_actions = certificate_actions
            request.session_token = token
            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_role(minimum_role, **kwargs):
    """Backwards-compatible wrapper that defers to require_certificate."""

    return require_certificate(required_role=minimum_role, **kwargs)


def destroy_sessions_for_user(user_id: str) -> int:
    if not user_id:
        return 0
    to_revoke = []
    for token, session in list(ACTIVE_SESSIONS.items()):
        session_user = (session.get("user") or {}).get("id")
        certificate_user = (session.get("certificate") or {}).get("user_id")
        if user_id in {session_user, certificate_user}:
            to_revoke.append(token)
    for token in to_revoke:
        destroy_session(token)
    return len(to_revoke)


def destroy_sessions_for_role(role: str) -> int:
    if not role:
        return 0
    normalized_role = role.lower()
    to_revoke = []
    for token, session in list(ACTIVE_SESSIONS.items()):
        certificate_role = (
            (session.get("certificate") or {}).get("role") or ""
        ).lower()
        binding_role = ((session.get("binding") or {}).get("role") or "").lower()
        if normalized_role in {certificate_role, binding_role}:
            to_revoke.append(token)
    for token in to_revoke:
        destroy_session(token)
    return len(to_revoke)
