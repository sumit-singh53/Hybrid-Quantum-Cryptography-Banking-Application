"""
Dynamic Navigation Routes
API endpoints to fetch navigation configuration dynamically from database.
"""
from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.models.role_model import Role
from app.models.permission_model import Permission
from app.services.rbac_service import RBACService

dynamic_nav_bp = Blueprint("dynamic_nav", __name__, url_prefix="/api/navigation")


@dynamic_nav_bp.route("/for-role/<role_name>", methods=["GET"])
@require_certificate()
def get_navigation_for_role(role_name):
    """
    Get navigation configuration for a specific role.
    Returns navigation items based on role's permissions.
    """
    role_data = RBACService.get_role_with_permissions(role_name)
    
    if not role_data:
        return jsonify({"message": f"Role '{role_name}' not found"}), 404
    
    # Build navigation from permissions
    navigation = build_navigation_from_permissions(role_data["permissions"])
    
    return jsonify({
        "role": role_name,
        "navigation": navigation,
        "permissions": [p["name"] for p in role_data["permissions"]],
    }), 200


@dynamic_nav_bp.route("/current-user", methods=["GET"])
@require_certificate()
def get_current_user_navigation():
    """
    Get navigation configuration for the current authenticated user.
    Automatically adapts to user's role and permissions.
    """
    user = getattr(request, "user", None)
    if not user:
        return jsonify({"message": "User not found"}), 401
    
    user_role = (user.get("role") or "").lower()
    if not user_role:
        return jsonify({"message": "User role not found"}), 403
    
    role_data = RBACService.get_role_with_permissions(user_role)
    
    if not role_data:
        return jsonify({"message": f"Role '{user_role}' not found"}), 404
    
    # Build navigation from permissions
    navigation = build_navigation_from_permissions(role_data["permissions"])
    
    return jsonify({
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "role": user_role,
        },
        "role_info": {
            "name": role_data["name"],
            "description": role_data["description"],
            "hierarchy_level": role_data["hierarchy_level"],
        },
        "navigation": navigation,
        "permissions": [p["name"] for p in role_data["permissions"]],
    }), 200


def build_navigation_from_permissions(permissions):
    """
    Dynamically build navigation items from permissions.
    Maps permissions to navigation items automatically.
    """
    navigation = []
    
    # Permission to navigation mapping
    permission_nav_map = {
        # Account permissions
        "view_own_account": {
            "id": "account-summary",
            "label": "Account Summary",
            "path": "/dashboard/accounts",
            "icon": "account_balance",
            "category": "accounts",
        },
        
        # Transaction permissions
        "view_own_transactions": {
            "id": "transaction-history",
            "label": "Transaction History",
            "path": "/dashboard/transactions",
            "icon": "history",
            "category": "transactions",
        },
        "create_transaction": {
            "id": "create-transaction",
            "label": "Create Transaction",
            "path": "/dashboard/transactions/create",
            "icon": "send",
            "category": "transactions",
        },
        "approve_transaction": {
            "id": "approve-transactions",
            "label": "Approve Transactions",
            "path": "/dashboard/transactions/approve",
            "icon": "check_circle",
            "category": "transactions",
        },
        "view_all_transactions": {
            "id": "all-transactions",
            "label": "All Transactions",
            "path": "/dashboard/transactions/all",
            "icon": "receipt_long",
            "category": "transactions",
        },
        
        # Customer permissions
        "view_all_customers": {
            "id": "customers",
            "label": "Customers",
            "path": "/dashboard/customers",
            "icon": "people",
            "category": "customers",
        },
        
        # Audit permissions
        "view_own_audit": {
            "id": "my-audit",
            "label": "My Audit Trail",
            "path": "/dashboard/audit/my",
            "icon": "description",
            "category": "audit",
        },
        "view_branch_audit": {
            "id": "branch-audit",
            "label": "Branch Audit",
            "path": "/dashboard/audit/branch",
            "icon": "description",
            "category": "audit",
        },
        "view_all_audit_logs": {
            "id": "audit-logs",
            "label": "Audit Logs",
            "path": "/dashboard/audit/all",
            "icon": "description",
            "category": "audit",
        },
        "view_global_audit": {
            "id": "global-audit",
            "label": "Global Audit",
            "path": "/dashboard/audit/global",
            "icon": "public",
            "category": "audit",
        },
        
        # Certificate permissions
        "view_own_certificate": {
            "id": "my-certificate",
            "label": "My Certificate",
            "path": "/dashboard/certificate",
            "icon": "badge",
            "category": "security",
        },
        "view_all_certificates": {
            "id": "certificates",
            "label": "Certificates",
            "path": "/dashboard/certificates",
            "icon": "badge",
            "category": "security",
        },
        "issue_certificate": {
            "id": "issue-certificate",
            "label": "Issue Certificate",
            "path": "/dashboard/certificates/issue",
            "icon": "add_circle",
            "category": "security",
        },
        "revoke_certificate": {
            "id": "revoke-certificate",
            "label": "Revoke Certificate",
            "path": "/dashboard/certificates/revoke",
            "icon": "block",
            "category": "security",
        },
        
        # User management permissions
        "manage_users": {
            "id": "users",
            "label": "User Management",
            "path": "/dashboard/users",
            "icon": "manage_accounts",
            "category": "administration",
        },
        "manage_roles": {
            "id": "roles",
            "label": "Role Management",
            "path": "/dashboard/roles",
            "icon": "badge",
            "category": "administration",
        },
        "manage_permissions": {
            "id": "permissions",
            "label": "Permissions",
            "path": "/dashboard/permissions",
            "icon": "policy",
            "category": "administration",
        },
        
        # Reports permissions
        "view_manager_reports": {
            "id": "reports",
            "label": "Reports",
            "path": "/dashboard/reports",
            "icon": "bar_chart",
            "category": "reports",
        },
        "export_audit_reports": {
            "id": "export-reports",
            "label": "Export Reports",
            "path": "/dashboard/reports/export",
            "icon": "file_download",
            "category": "reports",
        },
        
        # Security permissions
        "view_security_events": {
            "id": "security-events",
            "label": "Security Events",
            "path": "/dashboard/security/events",
            "icon": "security",
            "category": "security",
        },
        "view_all_security_events": {
            "id": "all-security-events",
            "label": "All Security Events",
            "path": "/dashboard/security/all",
            "icon": "shield",
            "category": "security",
        },
        "manage_crl": {
            "id": "crl-management",
            "label": "CRL Management",
            "path": "/dashboard/crl",
            "icon": "list",
            "category": "security",
        },
        "kill_sessions": {
            "id": "session-management",
            "label": "Session Management",
            "path": "/dashboard/sessions",
            "icon": "logout",
            "category": "security",
        },
        
        # System permissions
        "manage_system_config": {
            "id": "system-config",
            "label": "System Configuration",
            "path": "/dashboard/system/config",
            "icon": "settings",
            "category": "system",
        },
        "rotate_ca_keys": {
            "id": "key-rotation",
            "label": "Key Rotation",
            "path": "/dashboard/system/keys",
            "icon": "key",
            "category": "system",
        },
    }
    
    # Always add dashboard home
    navigation.append({
        "id": "dashboard-home",
        "label": "Dashboard",
        "path": "/dashboard",
        "icon": "dashboard",
        "category": "home",
    })
    
    # Add navigation items based on permissions
    for perm in permissions:
        perm_name = perm.get("name")
        if perm_name in permission_nav_map:
            navigation.append(permission_nav_map[perm_name])
    
    # Always add profile and logout
    navigation.extend([
        {
            "id": "profile",
            "label": "Profile",
            "path": "/dashboard/profile",
            "icon": "person",
            "category": "user",
        },
        {
            "id": "logout",
            "label": "Logout",
            "path": "/logout",
            "icon": "logout",
            "category": "user",
        },
    ])
    
    return navigation
