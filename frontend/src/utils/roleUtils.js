/**
 * Central role definitions
 * Keep role names consistent with backend
 */

export const ROLES = {
    CUSTOMER: "customer",
    MANAGER: "manager",
    AUDITOR_CLERK: "auditor_clerk",
    SYSTEM_ADMIN: "system_admin",
};

/**
 * Get dashboard path by role
 * @param {string} role
 */
export const getDashboardPathByRole = (role) => {
    switch (role) {
        case ROLES.CUSTOMER:
            return "/dashboard";
        case ROLES.AUDITOR_CLERK:
            return "/dashboard";
        case ROLES.MANAGER:
            return "/dashboard/manager";
        case ROLES.SYSTEM_ADMIN:
            return "/system-admin/dashboard";
        default:
            return "/login";
    }
};

/**
 * Check if role is allowed
 * @param {string} role
 * @param {Array} allowedRoles
 */
export const isRoleAllowed = (role, allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
};

/**
 * UI visibility helper
 * @param {string} role
 * @param {Array} visibleFor
 */
export const isVisibleForRole = (role, visibleFor = []) => {
    return isRoleAllowed(role, visibleFor);
};
