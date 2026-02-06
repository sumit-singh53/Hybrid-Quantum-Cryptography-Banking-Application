from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.security.security_event_store import SecurityEventStore
from app.services.certificate_service import CertificateService
from app.services.customer_portal_service import CustomerPortalService

customer_bp = Blueprint("customer", __name__, url_prefix="/api/customer")


@customer_bp.route("/overview", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_overview():
    session = getattr(request, "session", {}) or {}
    certificate = getattr(request, "certificate", {}) or {}
    binding = session.get("binding")
    user = request.user or {}
    payload = CustomerPortalService.build_overview(
        user_id=user.get("id"), certificate=certificate, session_binding=binding
    )
    return jsonify(payload)


@customer_bp.route("/accounts", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_accounts():
    user = request.user or {}
    payload = CustomerPortalService.accounts_payload(user.get("id"))
    return jsonify(payload)


@customer_bp.route("/transactions", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_transactions():
    user = request.user or {}
    return jsonify(CustomerPortalService.recent_transactions(user.get("id"), limit=20))


@customer_bp.route("/audit-trail", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_audit_trail():
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id")
    entries = CustomerPortalService.audit_trail(certificate_id)
    return jsonify(entries)


@customer_bp.route("/certificate", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_certificate():
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id")
    role = certificate.get("role")
    if not certificate_id:
        return jsonify({"message": "Certificate identifier missing"}), 400
    try:
        plaintext, resolved_role, _ = CertificateService.fetch_certificate_text(
            certificate_id, role
        )
    except FileNotFoundError:
        return jsonify({"message": "Certificate not found"}), 404
    return (
        jsonify(
            {
                "certificate_id": certificate_id,
                "role": resolved_role,
                "certificate_pem": plaintext,
            }
        ),
        200,
    )


@customer_bp.route("/security-status", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_status():
    """Comprehensive security status endpoint for customer dashboard."""
    session = getattr(request, "session", {}) or {}
    certificate = getattr(request, "certificate", {}) or {}
    user = request.user or {}
    user_id = user.get("id")
    certificate_id = certificate.get("certificate_id")
    
    # Get last login details with real data
    last_login = CustomerPortalService.last_login_snapshot(user_id)
    
    # Get certificate summary with expiry and status
    certificate_summary = CustomerPortalService.summarize_certificate(certificate)
    
    # Get device binding state
    binding = session.get("binding")
    session_device = (binding or {}).get("device_id")
    enrolled_device = certificate.get("device_id")
    requires_reverify = bool(
        enrolled_device and session_device and session_device != enrolled_device
    )
    
    device_state = {
        "session_device_id": session_device,
        "enrolled_device_id": enrolled_device,
        "device_label": last_login.get("device_label"),
        "requires_reverify": requires_reverify,
        "bound": bool(enrolled_device),
    }
    
    # Get security events count
    try:
        security_events_count = SecurityEventStore.count_events()
        recent_events = SecurityEventStore.query_events(limit=5)
    except Exception:  # pylint: disable=broad-except
        security_events_count = 0
        recent_events = []
    
    # Get latest audit entry
    latest_audit = CustomerPortalService.audit_trail(certificate_id, limit=1)
    
    # Session info
    session_created_at = session.get("created_at")
    
    return jsonify({
        "last_login": last_login,
        "certificate": certificate_summary,
        "device_state": device_state,
        "security_events": {
            "total_count": security_events_count,
            "recent": recent_events,
        },
        "latest_request": latest_audit[0] if latest_audit else None,
        "session": {
            "created_at": session_created_at,
            "active": True,
        },
        "encryption": {
            "algorithm": "ML-KEM + RSA",
            "type": "PQ + RSA hybrid",
            "active": True,
        }
    })
