/**
 * Universal Dashboard
 * Automatically adapts to any role created by admin.
 * Routes to role-specific dashboards for all roles
 */
import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import CustomerDashboard from "../../customer/CustomerDashboard/CustomerDashboard";
import ManagerDashboard from "../../manager/ManagerDashboard/ManagerDashboard";
import AuditorClerkDashboard from "../../auditorClerk/AuditorClerkDashboard/AuditorClerkDashboard";
import SystemAdminDashboard from "../../admin/SystemAdminDashboard/SystemAdminDashboard";
import api from "../../../services/api";
import "./UniversalDashboard.css";

const UniversalDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.role) {
      const userRole = user.role.toLowerCase();
      
      // For roles with dedicated dashboards, skip API call
      if (['customer', 'manager', 'auditor_clerk', 'system_admin'].includes(userRole)) {
        setLoading(false);
        return;
      }
      
      // For other roles, fetch dynamic navigation
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dynamic navigation and role info
      const response = await api.get("/navigation/current-user");
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Route to role-specific dashboards
  const userRole = user?.role?.toLowerCase();

  // Customer Dashboard
  if (userRole === 'customer') {
    return <CustomerDashboard />;
  }

  // Manager Dashboard
  if (userRole === 'manager') {
    return <ManagerDashboard />;
  }

  // Auditor Clerk Dashboard
  if (userRole === 'auditor_clerk') {
    return <AuditorClerkDashboard />;
  }

  // System Admin Dashboard
  if (userRole === 'system_admin') {
    return <SystemAdminDashboard />;
  }

  const getRoleIcon = (role) => {
    const icons = {
      customer: "👤",
      manager: "👔",
      auditor_clerk: "🧾",
      system_admin: "🛡️",
    };
    return icons[role?.toLowerCase()] || "👤";
  };

  const getRoleColor = (role) => {
    const colors = {
      customer: "#3b82f6",
      manager: "#8b5cf6",
      auditor_clerk: "#f59e0b",
      system_admin: "#ef4444",
    };
    return colors[role?.toLowerCase()] || "#3b82f6";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      home: "home",
      accounts: "account_balance",
      transactions: "receipt",
      customers: "people",
      audit: "description",
      security: "security",
      administration: "admin_panel_settings",
      reports: "bar_chart",
      system: "settings",
      user: "person",
    };
    return icons[category] || "circle";
  };

  const groupNavigationByCategory = (navigation) => {
    const grouped = {};
    
    navigation.forEach((item) => {
      const category = item.category || "other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      home: "Home",
      accounts: "Accounts",
      transactions: "Transactions",
      customers: "Customers",
      audit: "Audit & Compliance",
      security: "Security",
      administration: "Administration",
      reports: "Reports",
      system: "System",
      user: "User",
      other: "Other",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="universal-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="universal-dashboard error">
        <span className="material-icons error-icon">error</span>
        <h2>Failed to Load Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { user: userData, role_info, navigation, permissions } = dashboardData;
  const groupedNav = groupNavigationByCategory(navigation);
  const roleColor = getRoleColor(userData.role);

  return (
    <div className="universal-dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome" style={{ borderLeftColor: roleColor }}>
        <div className="welcome-icon">{getRoleIcon(userData.role)}</div>
        <div className="welcome-content">
          <h1>Welcome back, {userData.name}!</h1>
          <p className="role-description">{role_info.description}</p>
          <div className="role-badge" style={{ backgroundColor: roleColor }}>
            {role_info.name}
            <span className="hierarchy-badge">Level {role_info.hierarchy_level}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="material-icons stat-icon">verified_user</span>
          <div className="stat-content">
            <h3>{permissions.length}</h3>
            <p>Permissions</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-icons stat-icon">apps</span>
          <div className="stat-content">
            <h3>{navigation.length}</h3>
            <p>Available Features</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-icons stat-icon">shield</span>
          <div className="stat-content">
            <h3>Active</h3>
            <p>Security Status</p>
          </div>
        </div>
      </div>

      {/* Navigation Categories */}
      <div className="dashboard-categories">
        <h2>Your Features</h2>
        <p className="categories-subtitle">
          Based on your role and permissions, you have access to the following features:
        </p>

        {Object.entries(groupedNav).map(([category, items]) => (
          <div key={category} className="category-section">
            <div className="category-header">
              <span className="material-icons category-icon">
                {getCategoryIcon(category)}
              </span>
              <h3>{getCategoryLabel(category)}</h3>
              <span className="category-count">{items.length}</span>
            </div>

            <div className="category-items">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.path}
                  className="feature-card"
                  style={{ borderTopColor: roleColor }}
                >
                  <span className="material-icons feature-icon">{item.icon}</span>
                  <h4>{item.label}</h4>
                  <p>Access {item.label.toLowerCase()}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permissions List */}
      <div className="dashboard-permissions">
        <h2>Your Permissions</h2>
        <p className="permissions-subtitle">
          You have {permissions.length} permissions assigned to your role
        </p>
        <div className="permissions-grid">
          {permissions.map((perm) => (
            <div key={perm} className="permission-badge">
              <span className="material-icons">check_circle</span>
              {perm.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UniversalDashboard;
