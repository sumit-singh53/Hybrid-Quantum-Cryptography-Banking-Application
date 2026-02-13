/**
 * Role-Based Sidebar Navigation
 * Dynamically renders navigation based on user role and permissions.
 * Uses centralized navigation config - no hardcoded permissions.
 */
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getNavigationForRole,
  filterNavigationByPermissions,
} from "../../config/navigationConfig";
import { updateAdminBreadcrumb } from "../../utils/navigationHelper";
import "./RoleBasedSidebar.css";

const RoleBasedSidebar = ({ onCollapseChange }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [navigationItems, setNavigationItems] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    if (!user || !user.role) {
      setNavigationItems([]);
      return;
    }

    // Get navigation items for user's role
    const roleNavigation = getNavigationForRole(user.role);

    // Get user's permissions (client-side check for UX only)
    const userPermissions = getUserPermissions(user.role);

    // Filter navigation by permissions
    const filteredNav = filterNavigationByPermissions(
      roleNavigation,
      userPermissions
    );

    setNavigationItems(filteredNav);
  }, [user]);

  // Auto-open group containing active page on mount and location change
  useEffect(() => {
    if (navigationItems.length === 0) return;

    const currentPath = location.pathname;
    const newOpenGroups = {};

    // Find which group contains the active page
    navigationItems.forEach((item) => {
      if (item.isGroup && item.children) {
        const hasActivePath = item.children.some(
          (child) => child.path === currentPath
        );
        if (hasActivePath) {
          newOpenGroups[item.id] = true;
        }
      }
    });

    // Only update if there are groups to open
    if (Object.keys(newOpenGroups).length > 0) {
      setOpenGroups(newOpenGroups);
    }
  }, [location.pathname, navigationItems]);

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // Close all groups when collapsing sidebar
    if (newCollapsedState) {
      setOpenGroups({});
    }
    
    // Notify parent component about collapse state change
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getUserPermissions = (role) => {
    // This matches the backend permission definitions
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

    return rolePermissions[role?.toLowerCase()] || [];
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      customer: "🧑‍💼",
      manager: "👔",
      auditor_clerk: "🧾",
      system_admin: "🛡️",
    };
    return roleIcons[role?.toLowerCase()] || "👤";
  };

  const getIconElement = (iconName) => {
    // Material Icons mapping
    return <span className="material-icons">{iconName}</span>;
  };

  if (!user || !user.role) {
    return null;
  }

  return (
    <aside className={`role-based-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="role-badge">
          <span className="role-icon">{getRoleIcon(user.role)}</span>
          {!isCollapsed && (
            <div className="role-info">
              <span className="role-name text-black">PQC + RSA/ECC</span>
              <span className="user-name">Banking System</span>
            </div>
          )}
        </div>
        <button
          className="collapse-btn"
          onClick={handleCollapseToggle}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-icons text-white">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => {
            // Check if this is a group with children
            if (item.isGroup && item.children) {
              const isOpen = openGroups[item.id];
              
              return (
                <li key={item.id} className="nav-item nav-group">
                  {/* Group Header */}
                  <button
                    className="nav-link nav-group-header"
                    onClick={() => toggleGroup(item.id)}
                    title={isCollapsed ? item.label : ""}
                  >
                    <span className="nav-icon text-white">{getIconElement(item.icon)}</span>
                    {!isCollapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className="material-icons group-arrow">
                          {isOpen ? "expand_less" : "expand_more"}
                        </span>
                      </>
                    )}
                  </button>
                  
                  {/* Group Children (Dropdown) */}
                  {!isCollapsed && isOpen && (
                    <ul className="nav-sublist">
                      {item.children.map((child) => (
                        <li key={child.id} className="nav-item nav-subitem">
                          <Link
                            to={child.path}
                            className={`nav-link nav-sublink ${isActive(child.path) ? "active" : ""}`}
                            onClick={() => updateAdminBreadcrumb(child.label)}
                          >
                            <span className="nav-icon">{getIconElement(child.icon)}</span>
                            <span className="nav-label">{child.label}</span>
                            {isActive(child.path) && (
                              <span className="active-indicator"></span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            
            // Regular navigation item (not a group)
            return (
              <li key={item.id} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? "active" : ""}`}
                  title={isCollapsed ? item.label : ""}
                  onClick={() => updateAdminBreadcrumb(item.label)}
                >
                  <span className="nav-icon">{getIconElement(item.icon)}</span>
                  {!isCollapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {isActive(item.path) && (
                    <span className="active-indicator"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="security-badge">
            <span className="material-icons">verified_user</span>
            <span className="security-text">Quantum-Safe Banking</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default RoleBasedSidebar;
