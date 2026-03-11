"""
RBAC Enforcement Demo Routes
Demonstrates strict backend permission enforcement with zero frontend reliance.
"""
from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.security.rbac_enforcer import (
    RBACEnforcer,
    get_current_user,
    get_current_role,
    get_current_permissions,
    has_permission,
    require_permission_or_403,
)

demo_rbac_bp = Blueprint("demo_rbac", __name__, url_prefix="/api/demo/rbac")


# ============================================================================
# EXAMPLE 1: Single Permission Enforcement
# ============================================================================
@demo_rbac_bp.route("/customer-only", methods=["GET"])
@require_certificate()  # Step 1: Authenticate
@RBACEnforcer.enforce_permission("view_own_account")  # Step 2: Enforce permission
def customer_only_endpoint():
    """
    Only accessible to users with 'view_own_account' permission.
    - Customers: ✅ ALLOWED
    - Managers: ✅ ALLOWED (they have this permission too)
    - Auditors: ❌ FORBIDDEN
    - Admins: ✅ ALLOWED
    """
    user = get_current_user()
    role = get_current_role()
    
    return jsonify({
        "message": "Access granted to customer-only endpoint",
        "user": user.get("name"),
        "role": role,
        "endpoint": "customer-only"
    }), 200



# ============================================================================
# EXAMPLE 2: Manager-Only Permission
# ============================================================================
@demo_rbac_bp.route("/manager-only", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_permission("approve_transaction")
def manager_only_endpoint():
    """
    Only accessible to users with 'approve_transaction' permission.
    - Customers: ❌ FORBIDDEN
    - Managers: ✅ ALLOWED
    - Auditors: ❌ FORBIDDEN
    - Admins: ❌ FORBIDDEN (admins don't have this operational permission)
    """
    return jsonify({
        "message": "Access granted to manager-only endpoint",
        "user": get_current_user().get("name"),
        "role": get_current_role(),
    }), 200


# ============================================================================
# EXAMPLE 3: Multiple Permissions (ALL required)
# ============================================================================
@demo_rbac_bp.route("/multi-permission-all", methods=["POST"])
@require_certificate()
@RBACEnforcer.enforce_permission(
    ["approve_transaction", "view_all_customers"],
    match_mode="all"
)
def multi_permission_all_endpoint():
    """
    Requires BOTH permissions.
    - Customers: ❌ FORBIDDEN
    - Managers: ✅ ALLOWED (have both)
    - Auditors: ❌ FORBIDDEN
    - Admins: ❌ FORBIDDEN (don't have approve_transaction)
    """
    return jsonify({
        "message": "Access granted - user has ALL required permissions",
        "required": ["approve_transaction", "view_all_customers"],
    }), 200



# ============================================================================
# EXAMPLE 4: Multiple Permissions (ANY required)
# ============================================================================
@demo_rbac_bp.route("/multi-permission-any", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_permission(
    ["approve_transaction", "view_all_audit_logs"],
    match_mode="any"
)
def multi_permission_any_endpoint():
    """
    Requires AT LEAST ONE permission.
    - Customers: ❌ FORBIDDEN
    - Managers: ✅ ALLOWED (have approve_transaction)
    - Auditors: ✅ ALLOWED (have view_all_audit_logs)
    - Admins: ✅ ALLOWED (have view_all_audit_logs)
    """
    return jsonify({
        "message": "Access granted - user has at least one required permission",
        "required_any": ["approve_transaction", "view_all_audit_logs"],
    }), 200


# ============================================================================
# EXAMPLE 5: Role-Based Enforcement
# ============================================================================
@demo_rbac_bp.route("/admin-only", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_role("system_admin")
def admin_only_endpoint():
    """
    Only accessible to system_admin role.
    - Customers: ❌ FORBIDDEN
    - Managers: ❌ FORBIDDEN
    - Auditors: ❌ FORBIDDEN
    - Admins: ✅ ALLOWED
    """
    return jsonify({
        "message": "Access granted to system admin",
        "role": get_current_role(),
    }), 200


# ============================================================================
# EXAMPLE 6: Multiple Roles Allowed
# ============================================================================
@demo_rbac_bp.route("/manager-or-admin", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_role(["manager", "system_admin"])
def manager_or_admin_endpoint():
    """
    Accessible to managers OR admins.
    - Customers: ❌ FORBIDDEN
    - Managers: ✅ ALLOWED
    - Auditors: ❌ FORBIDDEN
    - Admins: ✅ ALLOWED
    """
    return jsonify({
        "message": "Access granted to manager or admin",
        "role": get_current_role(),
    }), 200



# ============================================================================
# EXAMPLE 7: Hierarchy Level Enforcement
# ============================================================================
@demo_rbac_bp.route("/level-3-or-higher", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_hierarchy_level(3)
def hierarchy_level_endpoint():
    """
    Requires hierarchy level 3 or higher.
    - Customers (level 1): ❌ FORBIDDEN
    - Managers (level 2): ❌ FORBIDDEN
    - Auditors (level 3): ✅ ALLOWED
    - Admins (level 4): ✅ ALLOWED
    """
    return jsonify({
        "message": "Access granted - sufficient hierarchy level",
        "role": get_current_role(),
    }), 200


# ============================================================================
# EXAMPLE 8: Inline Permission Check
# ============================================================================
@demo_rbac_bp.route("/inline-check", methods=["POST"])
@require_certificate()
def inline_permission_check():
    """
    Demonstrates inline permission checking within the handler.
    Useful for conditional logic based on permissions.
    """
    user = get_current_user()
    role = get_current_role()
    
    # Get all user permissions
    permissions = get_current_permissions()
    
    # Check specific permission inline
    can_approve = has_permission("approve_transaction")
    can_audit = has_permission("view_all_audit_logs")
    
    # Conditional logic based on permissions
    if can_approve:
        action = "approve transactions"
    elif can_audit:
        action = "view audit logs"
    else:
        action = "view own data only"
    
    return jsonify({
        "message": "Inline permission check successful",
        "user": user.get("name"),
        "role": role,
        "permissions_count": len(permissions),
        "can_approve": can_approve,
        "can_audit": can_audit,
        "primary_action": action,
    }), 200


# ============================================================================
# EXAMPLE 9: Require Permission or 403
# ============================================================================
@demo_rbac_bp.route("/require-or-403", methods=["DELETE"])
@require_certificate()
def require_permission_or_403_example():
    """
    Demonstrates using require_permission_or_403 for inline enforcement.
    Automatically returns 403 if permission is missing.
    """
    # This will raise 403 if user doesn't have the permission
    require_permission_or_403("revoke_certificate")
    
    # If we reach here, user has the permission
    return jsonify({
        "message": "Certificate revoked successfully",
        "user": get_current_user().get("name"),
    }), 200



# ============================================================================
# EXAMPLE 10: Get Current User Info
# ============================================================================
@demo_rbac_bp.route("/whoami", methods=["GET"])
@require_certificate()
def whoami():
    """
    Returns current user information and permissions.
    Demonstrates extracting user data from session.
    """
    user = get_current_user()
    role = get_current_role()
    permissions = get_current_permissions()
    
    return jsonify({
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "role": role,
        },
        "permissions": sorted(list(permissions)),
        "permission_count": len(permissions),
    }), 200


# ============================================================================
# EXAMPLE 11: Forbidden Response (No Permission)
# ============================================================================
@demo_rbac_bp.route("/forbidden-demo", methods=["GET"])
@require_certificate()
@RBACEnforcer.enforce_permission("manage_users")
def forbidden_demo():
    """
    This endpoint requires 'manage_users' permission.
    Most users will get 403 Forbidden response.
    
    - Customers: ❌ 403 FORBIDDEN
    - Managers: ❌ 403 FORBIDDEN
    - Auditors: ❌ 403 FORBIDDEN
    - Admins: ✅ 200 OK
    
    Try accessing this as a customer to see the 403 response.
    """
    return jsonify({
        "message": "You have manage_users permission!",
        "role": get_current_role(),
    }), 200


# ============================================================================
# EXAMPLE 12: Unauthenticated Access (No Certificate)
# ============================================================================
@demo_rbac_bp.route("/no-auth-demo", methods=["GET"])
@RBACEnforcer.enforce_permission("view_own_account")
def no_auth_demo():
    """
    This endpoint has permission check but NO certificate requirement.
    Will return 401 Unauthorized if accessed without authentication.
    
    This demonstrates that RBAC middleware handles missing authentication.
    """
    return jsonify({
        "message": "This should never be reached without auth",
    }), 200
