from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
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
