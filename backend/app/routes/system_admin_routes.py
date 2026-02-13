import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.security.kyber_crystal import KyberCrystal
from app.security.device_binding_store import DeviceBindingStore
from app.services.system_admin_service import SystemAdminService
from app.services.crypto_management_service import CryptoManagementService
from app.services.system_monitoring_service import SystemMonitoringService
from app.utils.logger import AuditLogger


def system_admin_guard(*, allowed_actions=None, action_match="all"):
    actions = allowed_actions or ["GLOBAL_AUDIT"]
    return require_certificate(
        {"system_admin"}, allowed_actions=actions, action_match=action_match
    )


system_admin_bp = Blueprint("system_admin", __name__, url_prefix="/api/admin")


@system_admin_bp.route("/dashboard", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def system_admin_dashboard():
    payload = SystemAdminService.overview()
    return jsonify(payload)


@system_admin_bp.route("/certificates/summary", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def certificate_summary():
    return jsonify(SystemAdminService.certificate_inventory())


@system_admin_bp.route("/certificates/list", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def list_issued_certificates():
    """Get list of all issued certificates from filesystem."""
    certificates = SystemAdminService.list_issued_certificates()
    return jsonify({"certificates": certificates, "total": len(certificates)})


@system_admin_bp.route("/certificates/issue", methods=["POST"])
@system_admin_guard(allowed_actions=["ISSUE_CERT"])
def issue_system_admin_certificate():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    full_name = payload.get("full_name")
    device_secret = (payload.get("device_secret") or "").strip()
    rsa_public_key_spki = payload.get("rsa_public_key_spki")
    pq_public_key_b64 = payload.get("pq_public_key_b64")
    ml_kem_public_key_b64 = (payload.get("ml_kem_public_key_b64") or "").strip()
    auto_generate_mlkem = bool(payload.get("auto_generate_mlkem"))
    requested_role = payload.get("role")
    validity_days = int(payload.get("validity_days", 30))

    generated_device_secret = None
    if not device_secret:
        generated_device_secret = secrets.token_urlsafe(32)
        device_secret = generated_device_secret

    if not all([user_id, full_name, device_secret, rsa_public_key_spki]):
        return (
            jsonify(
                {
                    "message": "user_id, full_name, device_secret, and rsa_public_key_spki are required",
                }
            ),
            400,
        )

    generated_ml_kem_private_key_b64 = None
    if auto_generate_mlkem and not ml_kem_public_key_b64:
        keypair = KyberCrystal.generate_keypair()
        ml_kem_public_key_b64 = keypair["public_key"]
        generated_ml_kem_private_key_b64 = keypair["private_key"]

    if not ml_kem_public_key_b64:
        return (
            jsonify({"message": "ml_kem_public_key_b64 is required for issuance"}),
            400,
        )

    result = SystemAdminService.issue_system_admin_certificate(
        user_id=user_id,
        full_name=full_name,
        device_secret=device_secret,
        ml_kem_public_key_b64=ml_kem_public_key_b64,
        rsa_public_key_spki=rsa_public_key_spki,
        pq_public_key_b64=pq_public_key_b64,
        validity_days=validity_days,
        role=requested_role,
    )

    if generated_device_secret:
        result["device_secret_source"] = "generated"
    if generated_ml_kem_private_key_b64:
        result["ml_kem_private_key_b64"] = generated_ml_kem_private_key_b64
    AuditLogger.log_action(
        user=request.user,
        action=f"Issued system admin certificate for {user_id}",
    )
    return jsonify(result), 201


@system_admin_bp.route("/crl", methods=["GET"])
@system_admin_guard(allowed_actions=["MANAGE_CRL"])
def crl_details():
    return jsonify(SystemAdminService.crl_details())


@system_admin_bp.route("/crl/revoke", methods=["POST"])
@system_admin_guard(allowed_actions=["MANAGE_CRL"])
def crl_revoke():
    payload = request.get_json(silent=True) or {}
    certificate_id = payload.get("certificate_id")
    reason = payload.get("reason", "Security policy violation")
    if not certificate_id:
        return jsonify({"message": "certificate_id is required"}), 400
    metadata = SystemAdminService.revoke_certificate(
        certificate_id,
        reason=reason,
        requester=request.user,
    )
    AuditLogger.log_action(
        user=request.user,
        action=f"System admin revoked certificate {certificate_id}",
    )
    return jsonify(metadata)


@system_admin_bp.route("/device-secret/<user_id>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_device_secret(user_id):
    """Retrieve device secret for a user (admin only)."""
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400
    
    device_secret = DeviceBindingStore.get_secret(user_id)
    if not device_secret:
        return jsonify({"message": "Device secret not found for this user"}), 404
    
    from app.services.certificate_service import CertificateService
    device_id = CertificateService.derive_device_id(device_secret)
    
    AuditLogger.log_action(
        user=request.user,
        action=f"Retrieved device secret for user {user_id}",
    )
    
    return jsonify({
        "user_id": user_id,
        "device_secret": device_secret,
        "device_id": device_id,
        "message": "Device secret retrieved successfully"
    })


@system_admin_bp.route("/ca/rotate", methods=["POST"])
@system_admin_guard(allowed_actions=["MANAGE_CRL"])
def rotate_authority_keys():
    rotation_result = SystemAdminService.rotate_authority_keys()
    AuditLogger.log_action(
        user=request.user,
        action="Rotated CA key material",
    )
    return jsonify(rotation_result)


@system_admin_bp.route("/sessions/kill", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def kill_sessions():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    role = payload.get("role")
    if not user_id and not role:
        return jsonify({"message": "user_id or role is required"}), 400
    result = SystemAdminService.kill_sessions(user_id=user_id, role=role)
    AuditLogger.log_action(
        user=request.user,
        action=f"Initiated session kill switch (user_id={user_id or 'n/a'}, role={role or 'n/a'})",
    )
    return jsonify(result)


@system_admin_bp.route("/audit/global", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def global_audit_feed():
    """Get global audit feed with filtering and pagination."""
    # Pagination
    limit = int(request.args.get("limit", 20))
    page = int(request.args.get("page", 1))
    offset = (page - 1) * limit if page > 1 else 0
    
    # Filters
    search = request.args.get("search", "").strip()
    role = request.args.get("role", "").strip()
    action_type = request.args.get("actionType", "").strip()
    date_from = request.args.get("dateFrom", "").strip()
    date_to = request.args.get("dateTo", "").strip()
    
    feed = SystemAdminService.global_audit_feed(
        limit=limit,
        offset=offset,
        search=search,
        role=role,
        action_type=action_type,
        date_from=date_from,
        date_to=date_to,
    )
    
    # Get total count for pagination
    total = SystemAdminService.get_audit_count(
        search=search,
        role=role,
        action_type=action_type,
        date_from=date_from,
        date_to=date_to,
    )
    
    return jsonify({
        "audits": feed,
        "total": total,
        "page": page,
        "limit": limit,
    })


@system_admin_bp.route("/security/events", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def security_events():
    event_type = request.args.get("event_type")
    limit = int(request.args.get("limit", 50))
    page = int(request.args.get("page", 1))
    offset = (page - 1) * limit if page > 1 else 0
    events = SystemAdminService.list_security_events(event_type=event_type, limit=limit, offset=offset)
    total = len(events)  # For now, return total from current result
    return jsonify({"events": events, "total": total, "page": page, "limit": limit})


@system_admin_bp.route("/roles", methods=["GET"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def list_roles():
    payload = SystemAdminService.list_roles()
    return jsonify(payload)


@system_admin_bp.route("/roles", methods=["POST"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def create_role():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    try:
        role = SystemAdminService.create_role(name=name or "")
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    AuditLogger.log_action(
        user=request.user,
        action=f"Created role '{role['name']}'",
    )
    return jsonify({"role": role}), 201


@system_admin_bp.route("/roles/<int:role_id>", methods=["PUT"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def update_role(role_id: int):
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    try:
        role = SystemAdminService.update_role(role_id, name=name or "")
    except LookupError:
        return jsonify({"message": "Role not found"}), 404
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    AuditLogger.log_action(
        user=request.user,
        action=f"Updated role #{role_id}",
    )
    return jsonify({"role": role})


@system_admin_bp.route("/roles/<int:role_id>", methods=["DELETE"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def delete_role(role_id: int):
    try:
        role = SystemAdminService.delete_role(role_id)
    except LookupError:
        return jsonify({"message": "Role not found"}), 404
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    AuditLogger.log_action(
        user=request.user,
        action=f"Deleted role '{role['name']}'",
    )
    return jsonify({"role": role})


@system_admin_bp.route("/users", methods=["GET"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def list_managed_users():
    roles_param = request.args.get("roles") or request.args.get("role")
    roles = (
        [role.strip() for role in roles_param.split(",") if role.strip()]
        if roles_param
        else None
    )
    payload = SystemAdminService.list_users(roles=roles)
    return jsonify(payload)


@system_admin_bp.route("/users", methods=["POST"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def create_managed_user():
    body = request.get_json(silent=True) or {}
    try:
        user = SystemAdminService.create_user(
            username=body.get("username", ""),
            full_name=body.get("full_name", ""),
            email=body.get("email"),
            mobile=body.get("mobile", ""),
            address=body.get("address"),
            aadhar=body.get("aadhar"),
            pan=body.get("pan"),
            password=body.get("password"),
            role=body.get("role", ""),
            is_active=body.get("is_active", True),
        )
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"message": str(exc)}), 404
    AuditLogger.log_action(
        user=request.user,
        action=f"Created managed user '{user['username']}'",
    )
    return jsonify({"user": user}), 201


@system_admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def update_managed_user(user_id: int):
    body = request.get_json(silent=True) or {}
    try:
        user = SystemAdminService.update_user(
            user_id,
            username=body.get("username"),
            full_name=body.get("full_name"),
            email=body.get("email"),
            mobile=body.get("mobile"),
            address=body.get("address"),
            aadhar=body.get("aadhar"),
            pan=body.get("pan"),
            password=body.get("password"),
            role=body.get("role"),
            is_active=body.get("is_active"),
        )
    except LookupError as exc:
        return jsonify({"message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    AuditLogger.log_action(
        user=request.user,
        action=f"Updated managed user #{user_id}",
    )
    return jsonify({"user": user})


@system_admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@system_admin_guard(
    allowed_actions=["MANAGE_ROLES", "GLOBAL_AUDIT"], action_match="any"
)
def delete_managed_user(user_id: int):
    try:
        user = SystemAdminService.delete_user(user_id)
    except LookupError as exc:
        return jsonify({"message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400
    AuditLogger.log_action(
        user=request.user,
        action=f"Deleted managed user '{user['username']}'",
    )
    return jsonify({"user": user})


# =========================================
# Cryptography Management
# =========================================

@system_admin_bp.route("/crypto/status", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def crypto_status():
    """Get cryptography configuration status (read-only, no private keys exposed)."""
    status = CryptoManagementService.get_crypto_status()
    return jsonify(status)


@system_admin_bp.route("/crypto/health", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def crypto_health():
    """Get encryption health indicators."""
    health = CryptoManagementService.get_encryption_health()
    return jsonify(health)


@system_admin_bp.route("/crypto/algorithms", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def crypto_algorithms():
    """Get list of cryptographic algorithms in use."""
    algorithms = CryptoManagementService.get_crypto_algorithms()
    return jsonify({"algorithms": algorithms})


@system_admin_bp.route("/crypto/rotate-keys", methods=["POST"])
@system_admin_guard(allowed_actions=["MANAGE_CRL"])
def crypto_rotate_keys():
    """
    Trigger CA key rotation (both classical and post-quantum).
    This is a sensitive operation that should be logged and confirmed.
    """
    rotation_result = SystemAdminService.rotate_authority_keys()
    AuditLogger.log_action(
        user=request.user,
        action="Triggered cryptographic key rotation (CA keys)",
    )
    return jsonify(rotation_result)



# =========================================
# SYSTEM MONITORING
# =========================================

@system_admin_bp.route("/monitoring/health", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def system_health():
    """Get overall system health status."""
    health = SystemMonitoringService.get_system_health()
    return jsonify(health), 200


@system_admin_bp.route("/monitoring/security", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def security_metrics():
    """Get security monitoring metrics."""
    metrics = SystemMonitoringService.get_security_metrics()
    return jsonify(metrics), 200


@system_admin_bp.route("/monitoring/performance", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def performance_metrics():
    """Get performance metrics."""
    metrics = SystemMonitoringService.get_performance_metrics()
    return jsonify(metrics), 200


@system_admin_bp.route("/monitoring/alerts", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def system_alerts():
    """Get system alerts and warnings."""
    alerts = SystemMonitoringService.get_alerts()
    return jsonify(alerts), 200


@system_admin_bp.route("/monitoring/overview", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def monitoring_overview():
    """Get comprehensive monitoring overview."""
    overview = {
        "health": SystemMonitoringService.get_system_health(),
        "security": SystemMonitoringService.get_security_metrics(),
        "performance": SystemMonitoringService.get_performance_metrics(),
        "alerts": SystemMonitoringService.get_alerts(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    return jsonify(overview), 200


# =========================================
# INCIDENT RESPONSE
# =========================================

from app.services.incident_response_service import IncidentResponseService

@system_admin_bp.route("/incidents", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_incidents():
    """Get all incidents with optional filtering."""
    status = request.args.get("status")
    severity = request.args.get("severity")
    limit = int(request.args.get("limit", 50))
    
    incidents = IncidentResponseService.get_all_incidents(
        status=status,
        severity=severity,
        limit=limit
    )
    
    return jsonify({"incidents": incidents, "total": len(incidents)}), 200


@system_admin_bp.route("/incidents/statistics", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def incident_statistics():
    """Get incident statistics."""
    stats = IncidentResponseService.get_incident_statistics()
    return jsonify(stats), 200


@system_admin_bp.route("/incidents/<incident_id>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_incident(incident_id):
    """Get a specific incident by ID."""
    incident = IncidentResponseService.get_incident_by_id(incident_id)
    
    if not incident:
        return jsonify({"message": "Incident not found"}), 404
    
    return jsonify(incident), 200


@system_admin_bp.route("/incidents", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def create_incident():
    """Create a new incident."""
    data = request.get_json()
    
    if not data or not data.get("type") or not data.get("severity"):
        return jsonify({"message": "type and severity are required"}), 400
    
    admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
    
    incident = IncidentResponseService.create_incident(
        incident_type=data["type"],
        severity=data["severity"],
        description=data.get("description", ""),
        affected_user=data.get("affected_user"),
        affected_service=data.get("affected_service"),
        metadata=data.get("metadata"),
        created_by=admin_username
    )
    
    return jsonify(incident), 201


@system_admin_bp.route("/incidents/<incident_id>/status", methods=["PUT"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def update_incident_status(incident_id):
    """Update incident status."""
    data = request.get_json()
    
    if not data or not data.get("status"):
        return jsonify({"message": "status is required"}), 400
    
    admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
    
    try:
        incident = IncidentResponseService.update_incident_status(
            incident_id=incident_id,
            status=data["status"],
            admin_username=admin_username,
            notes=data.get("notes")
        )
        
        return jsonify(incident), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@system_admin_bp.route("/incidents/<incident_id>/lock-account", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def lock_account_incident(incident_id):
    """Lock a user account as incident response."""
    data = request.get_json()
    
    if not data or not data.get("user_id"):
        return jsonify({"message": "user_id is required"}), 400
    
    admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
    
    try:
        result = IncidentResponseService.lock_user_account(
            incident_id=incident_id,
            user_id=data["user_id"],
            admin_username=admin_username,
            reason=data.get("reason", "Incident response action")
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@system_admin_bp.route("/incidents/<incident_id>/unlock-account", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def unlock_account_incident(incident_id):
    """Unlock a user account."""
    data = request.get_json()
    
    if not data or not data.get("user_id"):
        return jsonify({"message": "user_id is required"}), 400
    
    admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
    
    try:
        result = IncidentResponseService.unlock_user_account(
            incident_id=incident_id,
            user_id=data["user_id"],
            admin_username=admin_username,
            reason=data.get("reason", "Incident resolved")
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@system_admin_bp.route("/incidents/detect", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def detect_incidents():
    """Auto-detect potential incidents from security events."""
    detected = IncidentResponseService.detect_incidents_from_security_events()
    return jsonify({"detected_incidents": detected, "count": len(detected)}), 200
