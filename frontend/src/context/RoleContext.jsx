import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const RoleContext = createContext();

/**
 * RoleProvider
 * - Manages user roles and permissions
 */
export const RoleProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      setRole(user.role);
    } else {
      setRole(null);
    }
  }, [isAuthenticated, user]);

  /**
   * Role based access check
   * @param {Array} allowedRoles
   */
  const hasAccess = (allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return (
    <RoleContext.Provider value={{ role, hasAccess }}>
      {children}
    </RoleContext.Provider>
  );
};

/**
 * Custom hook
 */
export const useRole = () => useContext(RoleContext);
