/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "../../services/rbacService";

/**
 * PermissionGate - Renders children only if user has required permissions
 * 
 * @param {string|string[]} permissions - Required permission(s)
 * @param {string} matchMode - 'all' (default) or 'any' for multiple permissions
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {React.ReactNode} fallback - Content to render if not authorized (optional)
 */
const PermissionGate = ({
  permissions,
  matchMode = "all",
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return fallback;
  }

  const userRole = user.role;
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  let hasAccess = false;

  if (matchMode === "any") {
    hasAccess = hasAnyPermission(userRole, permissionList);
  } else {
    hasAccess = hasAllPermissions(userRole, permissionList);
  }

  return hasAccess ? <>{children}</> : fallback;
};

/**
 * RoleGate - Renders children only if user has one of the allowed roles
 */
export const RoleGate = ({ allowedRoles, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return fallback;
  }

  const userRole = (user.role || "").toLowerCase();
  const normalizedRoles = (allowedRoles || []).map((r) => r.toLowerCase());

  const hasAccess = normalizedRoles.includes(userRole);

  return hasAccess ? <>{children}</> : fallback;
};

/**
 * HierarchyGate - Renders children only if user's role meets minimum hierarchy level
 */
export const HierarchyGate = ({ minimumLevel, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return fallback;
  }

  const { getRoleLevel } = require("../../services/rbacService");
  const userLevel = getRoleLevel(user.role);

  const hasAccess = userLevel >= minimumLevel;

  return hasAccess ? <>{children}</> : fallback;
};

/**
 * Hook for checking permissions in components
 */
export const usePermission = (permissionName) => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return false;
  }

  return hasPermission(user.role, permissionName);
};

/**
 * Hook for checking multiple permissions
 */
export const usePermissions = (permissionNames, matchMode = "all") => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return false;
  }

  if (matchMode === "any") {
    return hasAnyPermission(user.role, permissionNames);
  }

  return hasAllPermissions(user.role, permissionNames);
};

/**
 * Hook for checking role
 */
export const useRole = () => {
  const { user } = useAuth();
  return user?.role || null;
};

/**
 * Hook for checking if user has specific role
 */
export const useHasRole = (roleName) => {
  const { user } = useAuth();
  
  if (!user || !user.role) {
    return false;
  }

  return (user.role || "").toLowerCase() === (roleName || "").toLowerCase();
};

export default PermissionGate;
