"""
Centralized RBAC Permission Definitions
Defines all permissions and role-permission mappings for the system.
"""

# Permission definitions: (name, resource, action, description)
PERMISSIONS = [
    # Customer permissions
    ("view_own_account", "account", "read", "View own account information"),
    ("view_own_transactions", "transaction", "read", "View own transaction history"),
    ("create_transaction", "transaction", "create", "Create new transactions"),
    ("view_own_certificate", "certificate", "read", "View own certificate details"),
    ("view_own_audit", "audit", "read", "View own audit trail"),
    
    # Manager permissions
    ("view_all_customers", "customer", "read", "View all customer information"),
    ("approve_transaction", "transaction", "approve", "Approve pending transactions"),
    ("reject_transaction", "transaction", "reject", "Reject pending transactions"),
    ("revoke_certificate", "certificate", "revoke", "Revoke user certificates"),
    ("reset_device_binding", "device", "reset", "Reset device bindings"),
    ("view_branch_audit", "audit", "read", "View branch-level audit logs"),
    ("create_escalation", "escalation", "create", "Create escalation tickets"),
    ("view_escalations", "escalation", "read", "View escalation tickets"),
    ("view_manager_reports", "report", "read", "View manager reports"),
    
    # Auditor Clerk permissions
    ("view_all_audit_logs", "audit", "read", "View all system audit logs"),
    ("view_all_transactions", "transaction", "read", "View all transactions"),
    ("verify_transaction_integrity", "transaction", "verify", "Verify transaction integrity"),
    ("view_all_certificates", "certificate", "read", "View all certificates"),
    ("export_audit_reports", "report", "export", "Export audit reports"),
    ("view_security_events", "security", "read", "View security events"),
    
    # System Admin permissions
    ("manage_users", "user", "manage", "Create, update, delete users"),
    ("manage_roles", "role", "manage", "Create, update, delete roles"),
    ("manage_permissions", "permission", "manage", "Assign permissions to roles"),
    ("issue_certificate", "certificate", "issue", "Issue new certificates"),
    ("manage_crl", "crl", "manage", "Manage certificate revocation list"),
    ("rotate_ca_keys", "ca", "rotate", "Rotate CA key material"),
    ("kill_sessions", "session", "kill", "Terminate user sessions"),
    ("view_global_audit", "audit", "read", "View global audit logs"),
    ("view_all_security_events", "security", "read", "View all security events"),
    ("manage_system_config", "system", "manage", "Manage system configuration"),
]

# Role-Permission mappings
ROLE_PERMISSIONS = {
    "customer": [
        "view_own_account",
        "view_own_transactions",
        "create_transaction",
        "view_own_certificate",
        "view_own_audit",
    ],
    "manager": [
        "view_own_account",
        "view_own_transactions",
        "view_own_certificate",
        "view_own_audit",
        "view_all_customers",
        "approve_transaction",
        "reject_transaction",
        "revoke_certificate",
        "reset_device_binding",
        "view_branch_audit",
        "create_escalation",
        "view_escalations",
        "view_manager_reports",
    ],
    "auditor_clerk": [
        "view_own_certificate",
        "view_own_audit",
        "view_all_audit_logs",
        "view_all_transactions",
        "verify_transaction_integrity",
        "view_all_certificates",
        "export_audit_reports",
        "view_security_events",
    ],
    "system_admin": [
        "view_own_certificate",
        "view_own_audit",
        "manage_users",
        "manage_roles",
        "manage_permissions",
        "issue_certificate",
        "manage_crl",
        "rotate_ca_keys",
        "kill_sessions",
        "view_global_audit",
        "view_all_security_events",
        "manage_system_config",
        "view_all_audit_logs",
        "view_all_transactions",
        "view_all_certificates",
    ],
}

# Role hierarchy levels (higher number = more privileges)
ROLE_HIERARCHY = {
    "customer": 1,
    "manager": 2,
    "auditor_clerk": 3,
    "system_admin": 4,
}

# Legacy action mappings for backward compatibility with existing certificate actions
PERMISSION_TO_ACTIONS = {
    "view_own_account": ["VIEW_OWN"],
    "view_own_transactions": ["VIEW_OWN"],
    "create_transaction": ["CREATE_TRANSACTION"],
    "view_own_certificate": ["VIEW_OWN"],
    "view_own_audit": ["VIEW_OWN"],
    "view_all_customers": ["VIEW_ALL"],
    "approve_transaction": ["APPROVE_TRANSACTION"],
    "reject_transaction": ["APPROVE_TRANSACTION"],
    "revoke_certificate": ["REVOKE_CERT"],
    "reset_device_binding": ["REVOKE_CERT"],
    "view_branch_audit": ["VIEW_AUDIT"],
    "create_escalation": ["CREATE_ESCALATION"],
    "view_escalations": ["VIEW_ESCALATION"],
    "view_manager_reports": ["VIEW_REPORTS"],
    "view_all_audit_logs": ["VIEW_AUDIT", "VERIFY_LOGS"],
    "view_all_transactions": ["VIEW_AUDIT"],
    "verify_transaction_integrity": ["VERIFY_LOGS"],
    "view_all_certificates": ["VIEW_AUDIT"],
    "export_audit_reports": ["VIEW_AUDIT"],
    "view_security_events": ["VIEW_AUDIT"],
    "manage_users": ["MANAGE_ROLES"],
    "manage_roles": ["MANAGE_ROLES"],
    "manage_permissions": ["MANAGE_ROLES"],
    "issue_certificate": ["ISSUE_CERT"],
    "manage_crl": ["MANAGE_CRL"],
    "rotate_ca_keys": ["MANAGE_CRL"],
    "kill_sessions": ["GLOBAL_AUDIT"],
    "view_global_audit": ["GLOBAL_AUDIT"],
    "view_all_security_events": ["GLOBAL_AUDIT"],
    "manage_system_config": ["GLOBAL_AUDIT"],
}


def get_role_permissions(role_name):
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role_name.lower(), [])


def get_role_hierarchy_level(role_name):
    """Get hierarchy level for a role."""
    return ROLE_HIERARCHY.get(role_name.lower(), 0)


def has_higher_privilege(role1, role2):
    """Check if role1 has higher privilege than role2."""
    level1 = get_role_hierarchy_level(role1)
    level2 = get_role_hierarchy_level(role2)
    return level1 > level2


def get_actions_for_permission(permission_name):
    """Get legacy certificate actions for a permission."""
    return PERMISSION_TO_ACTIONS.get(permission_name, [])
