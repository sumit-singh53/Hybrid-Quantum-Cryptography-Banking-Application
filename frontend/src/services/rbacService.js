/**
 * RBAC Service
 * Handles role-based access control operations
 */
import api from "./api";

/**
 * Get all roles with their permissions
 */
export const getAllRoles = async () => {
  const response = await api.get("/rbac/roles");
  return response.data;
};

/**
 * Get detailed information about a specific role
 */
export const getRoleDetails = async (roleName) => {
  const response = await api.get(`/rbac/roles/${roleName}`);
  return response.data;
};

/**
 * Get all available permissions
 */
export const getAllPermissions = async () => {
  const response = await api.get("/rbac/permissions");
  return response.data;
};

/**
 * Get current user's permissions
 */
export const getCurrentUserPermissions = async () => {
  const response = await api.get("/rbac/user/permissions");
  return response.data;
};

/**
 * Check if current user has a specific permission
 */
export const checkPermission = async (permissionName) => {
  const response = await api.post("/rbac/check-permission", {
    permission_name: permissionName,
  });
  return response.data;
};

/**
 * Add a permission to a role (admin only)
 */
export const addPermissionToRole = async (roleName, permissionName) => {
  const response = await api.post(`/rbac/roles/${roleName}/permissions`, {
    permission_name: permissionName,
  });
  return response.data;
};

/**
 * Remove a permission from a role (admin only)
 */
export const removePermissionFromRole = async (roleName, permissionName) => {
  const response = await api.delete(
    `/rbac/roles/${roleName}/permissions/${permissionName}`
  );
  return response.data;
};

/**
 * Initialize RBAC system (admin only)
 */
export const initializeRBAC = async () => {
  const response = await api.post("/rbac/initialize");
  return response.data;
};

/**
 * Client-side permission check based on role
 * This is for UI rendering only - server-side validation is still required
 */
export const hasPermission = (userRole, permissionName) => {
  const rolePermissions = {
    customer: [
      "view_own_account",
      "view_own_transactions",
      "create_transaction",
      "view_own_certificate",
      "view_own_audit",
    ],
    manager: [
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
    auditor_clerk: [
      "view_own_certificate",
      "view_own_audit",
      "view_all_audit_logs",
      "view_all_transactions",
      "verify_transaction_integrity",
      "view_all_certificates",
      "export_audit_reports",
      "view_security_events",
    ],
    system_admin: [
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
  };

  const normalizedRole = (userRole || "").toLowerCase();
  const permissions = rolePermissions[normalizedRole] || [];
  return permissions.includes(permissionName);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (userRole, permissionNames) => {
  return permissionNames.some((perm) => hasPermission(userRole, perm));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (userRole, permissionNames) => {
  return permissionNames.every((perm) => hasPermission(userRole, perm));
};

/**
 * Get role hierarchy level
 */
export const getRoleLevel = (roleName) => {
  const hierarchy = {
    customer: 1,
    manager: 2,
    auditor_clerk: 3,
    system_admin: 4,
  };
  return hierarchy[(roleName || "").toLowerCase()] || 0;
};

/**
 * Check if role1 has higher privilege than role2
 */
export const hasHigherPrivilege = (role1, role2) => {
  return getRoleLevel(role1) > getRoleLevel(role2);
};

export default {
  getAllRoles,
  getRoleDetails,
  getAllPermissions,
  getCurrentUserPermissions,
  checkPermission,
  addPermissionToRole,
  removePermissionFromRole,
  initializeRBAC,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLevel,
  hasHigherPrivilege,
};
