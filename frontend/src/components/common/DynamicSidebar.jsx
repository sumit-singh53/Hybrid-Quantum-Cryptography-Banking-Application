/**
 * Dynamic Sidebar
 * Fetches navigation from backend automatically.
 * Adapts to any role created by admin without code changes.
 */
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./DynamicSidebar.css";

const DynamicSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [navigationItems, setNavigationItems] = useState([]);
  const [roleInfo, setRoleInfo] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role) {
      fetchNavigation();
    }
  }, [user]);

  const fetchNavigation = async () => {
    try {
      setLoading(true);
      const response = await api.get("/navigation/current-user");
      
      setNavigationItems(response.data.navigation || []);
      setRoleInfo(response.data.role_info || {});
    } catch (error) {
      console.error("Failed to fetch navigation:", error);
      // Fallback to basic navigation
      setNavigationItems([
        {
          id: "dashboard",
          label: "Dashboard",
          path: "/dashboard",
          icon: "dashboard",
        },
        {
          id: "profile",
          label: "Profile",
          path: "/dashboard/profile",
          icon: "person",
        },
        {
          id: "logout",
          label: "Logout",
          path: "/logout",
          icon: "logout",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      customer: "👤",
      manager: "👔",
      auditor_clerk: "🧾",
      system_admin: "🛡️",
    };
    return roleIcons[role?.toLowerCase()] || "👤";
  };

  const getIconElement = (iconName) => {
    return <span className="material-icons">{iconName}</span>;
  };

  if (!user || !user.role) {
    return null;
  }

  if (loading) {
    return (
      <aside className="dynamic-sidebar">
        <div className="sidebar-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`dynamic-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="role-badge">
          <span className="role-icon">{getRoleIcon(user.role)}</span>
          {!isCollapsed && (
            <div className="role-info">
              <span className="role-name">
                {roleInfo?.name || user.role}
              </span>
              <span className="user-name">{user.name}</span>
              {roleInfo?.hierarchy_level && (
                <span className="hierarchy-level">
                  Level {roleInfo.hierarchy_level}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
          {navigationItems.map((item) => (
            <li key={item.id} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${isActive(item.path) ? "active" : ""}`}
                title={isCollapsed ? item.label : ""}
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
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="security-badge">
            <span className="material-icons">verified_user</span>
            <span className="security-text">Quantum-Safe Banking</span>
          </div>
          {roleInfo?.description && (
            <p className="role-description">{roleInfo.description}</p>
          )}
        </div>
      )}
    </aside>
  );
};

export default DynamicSidebar;
