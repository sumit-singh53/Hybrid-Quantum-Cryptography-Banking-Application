"""
Customer Routes with Enhanced RBAC
Example of how to use the new RBAC middleware alongside existing certificate authentication.
"""
from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.security.rbac_middleware import require_permission, require_self_or_permission
from app.services.certificate_service import CertificateService
from app.services.customer_portal_service import CustomerPortalService

customer_rbac_bp = Blueprint("customer_rbac", __name__, url_prefix="/api/customer")


# Example 1: Basic permission check
@customer_rbac_bp.route("/overview", methods=["GET"])
@require_certificate("customer")  # Certificate authentication
@require_permission("view_own_account")  # Permission check
def customer_overview():
    """Customer overview - requires view_own_account permission."""
    session = getattr(request, "session", {}) or {}
    certificate = getattr(request, "certificate", {}) or {}
    binding = session.get("binding")
    user = request.user or {}
    payload = CustomerPortalService.build_overview(
        user_id=user.get("id"), certificate=certificate, session_binding=binding
    )
    return jsonify(payload)


# Example 2: Multiple permissions (all required)
@customer_rbac_bp.route("/accounts", methods=["GET"])
@require_certificate("customer")
@require_permission("view_own_account", "view_own_transactions")
def customer_accounts():
    """Customer accounts - requires both view_own_account and view_own_transactions."""
    user = request.user or {}
    payload = CustomerPortalService.accounts_payload(user.get("id"))
    return jsonify(payload)


# Example 3: Self-or-permission pattern
@customer_rbac_bp.route("/transactions/<user_id>", methods=["GET"])
@require_certificate()
@require_self_or_permission("view_all_transactions", user_id_param="user_id")
def customer_transactions(user_id):
    """
    View transactions for a user.
    Users can view their own transactions OR have view_all_transactions permission.
    """
    return jsonify(CustomerPortalService.recent_transactions(user_id, limit=20))


# Example 4: Using combined decorator
from app.security.rbac_middleware import require_auth_and_permission

@customer_rbac_bp.route("/audit-trail", methods=["GET"])
@require_auth_and_permission("view_own_audit")
def customer_audit_trail():
    """
    Customer audit trail - uses combined auth + permission decorator.
    This is more concise than separate decorators.
    """
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id")
    entries = CustomerPortalService.audit_trail(certificate_id)
    return jsonify(entries)


# Example 5: Programmatic permission check
@customer_rbac_bp.route("/certificate", methods=["GET"])
@require_certificate("customer")
def customer_certificate():
    """
    Get customer certificate with programmatic permission check.
    Demonstrates checking permissions in code rather than decorator.
    """
    from app.security.rbac_middleware import check_permission
    
    user = request.user or {}
    user_role = (user.get("role") or "").lower()
    
    # Check permission programmatically
    if not check_permission(user_role, "view_own_certificate"):
        return jsonify({
            "message": "You don't have permission to view certificates"
        }), 403
    
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
    
    return jsonify({
        "certificate_id": certificate_id,
        "role": resolved_role,
        "certificate_pem": plaintext,
    }), 200


# Example 6: Conditional features based on permissions
@customer_rbac_bp.route("/features", methods=["GET"])
@require_certificate()
def customer_features():
    """
    Return available features based on user's permissions.
    Useful for dynamic UI rendering.
    """
    from app.security.rbac_middleware import get_user_permissions
    
    user = request.user or {}
    user_role = (user.get("role") or "").lower()
    
    # Get all permissions for user's role
    permissions = get_user_permissions(user_role)
    
    # Build feature flags based on permissions
    features = {
        "can_create_transaction": "create_transaction" in permissions,
        "can_view_accounts": "view_own_account" in permissions,
        "can_view_transactions": "view_own_transactions" in permissions,
        "can_view_certificate": "view_own_certificate" in permissions,
        "can_view_audit": "view_own_audit" in permissions,
    }
    
    return jsonify({
        "user_role": user_role,
        "permissions": permissions,
        "features": features,
    })
