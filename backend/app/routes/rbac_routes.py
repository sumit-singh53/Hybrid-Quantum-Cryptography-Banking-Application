"""
RBAC Management Routes
Endpoints for managing roles, permissions, and their relationships.
"""
from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.security.rbac_middleware import require_permission
from app.services.rbac_service import RBACService
from app.utils.logger import AuditLogger


rbac_bp = Blueprint("rbac", __name__, url_prefix="/api/rbac")


@rbac_bp.route("/initialize", methods=["POST"])
@require_certificate({"system_admin"}, allowed_actions=["MANAGE_ROLES"])
def initialize_rbac():
    """Initialize RBAC system with default roles and permissions."""
    result = RBACService.initialize_rbac()
    AuditLogger.log_action(
        user=request.user,
        action="Initialized RBAC system",
    )
    return jsonify(result), 200


@rbac_bp.route("/roles", methods=["GET"])
@require_certificate(allowed_actions=["GLOBAL_AUDIT", "MANAGE_ROLES"])
def list_roles():
    """Get all roles with their permissions."""
    roles = RBACService.get_all_roles_with_permissions()
    return jsonify({"roles": roles, "total": len(roles)}), 200


@rbac_bp.route("/roles/<role_name>", methods=["GET"])
@require_certificate(allowed_actions=["GLOBAL_AUDIT", "MANAGE_ROLES"])
def get_role_details(role_name):
    """Get detailed information about a specific role."""
    role = RBACService.get_role_with_permissions(role_name)
    if not role:
        return jsonify({"message": f"Role '{role_name}' not found"}), 404
    return jsonify(role), 200


@rbac_bp.route("/permissions", methods=["GET"])
@require_certificate(allowed_actions=["GLOBAL_AUDIT", "MANAGE_ROLES"])
def list_permissions():
    """Get all available permissions."""
    permissions = RBACService.get_all_permissions()
    return jsonify({"permissions": permissions, "total": len(permissions)}), 200


@rbac_bp.route("/roles/<role_name>/permissions", methods=["POST"])
@require_certificate({"system_admin"}, allowed_actions=["MANAGE_ROLES"])
def add_permission_to_role(role_name):
    """Add a permission to a role."""
    payload = request.get_json(silent=True) or {}
    permission_name = payload.get("permission_name")
    
    if not permission_name:
        return jsonify({"message": "permission_name is required"}), 400
    
    try:
        result = RBACService.add_permission_to_role(role_name, permission_name)
        AuditLogger.log_action(
            user=request.user,
            action=f"Added permission '{permission_name}' to role '{role_name}'",
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@rbac_bp.route("/roles/<role_name>/permissions/<permission_name>", methods=["DELETE"])
@require_certificate({"system_admin"}, allowed_actions=["MANAGE_ROLES"])
def remove_permission_from_role(role_name, permission_name):
    """Remove a permission from a role."""
    try:
        result = RBACService.remove_permission_from_role(role_name, permission_name)
        AuditLogger.log_action(
            user=request.user,
            action=f"Removed permission '{permission_name}' from role '{role_name}'",
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@rbac_bp.route("/user/permissions", methods=["GET"])
@require_certificate()
def get_current_user_permissions():
    """Get permissions for the currently authenticated user."""
    user = request.user
    certificate = getattr(request, "certificate", {}) or {}
    
    # Get permissions from database if user object is available
    from app.models.user_model import User
    db_user = User.query.filter_by(username=user.get("name")).first()
    
    if db_user:
        permissions = RBACService.get_user_permissions(db_user)
    else:
        # Fallback to role-based permissions
        from app.security.rbac_permissions import get_role_permissions
        user_role = (user.get("role") or "").lower()
        permission_names = get_role_permissions(user_role)
        permissions = [{"name": p} for p in permission_names]
    
    return jsonify({
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "role": user.get("role"),
        },
        "permissions": permissions,
        "certificate_actions": certificate.get("allowed_actions", []),
    }), 200


@rbac_bp.route("/check-permission", methods=["POST"])
@require_certificate()
def check_user_permission():
    """Check if current user has a specific permission."""
    payload = request.get_json(silent=True) or {}
    permission_name = payload.get("permission_name")
    
    if not permission_name:
        return jsonify({"message": "permission_name is required"}), 400
    
    user = request.user
    from app.models.user_model import User
    db_user = User.query.filter_by(username=user.get("name")).first()
    
    if db_user:
        has_permission = RBACService.user_has_permission(db_user, permission_name)
    else:
        # Fallback to role-based check
        from app.security.rbac_middleware import check_permission
        user_role = (user.get("role") or "").lower()
        has_permission = check_permission(user_role, permission_name)
    
    return jsonify({
        "permission": permission_name,
        "has_permission": has_permission,
        "user_role": user.get("role"),
    }), 200
