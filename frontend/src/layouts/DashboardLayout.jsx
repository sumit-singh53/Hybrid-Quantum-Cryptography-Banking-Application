/**
 * Dashboard Layout with Role-Based Sidebar
 * Main layout component that includes the dynamic sidebar navigation
 */
import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import RoleBasedSidebar from "../components/common/RoleBasedSidebar";
import { useAuth } from "../context/AuthContext";
import "./DashboardLayout.css";

const DashboardLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="dashboard-layout">
      {/* Role-Based Sidebar - Automatically shows correct navigation */}
      <RoleBasedSidebar 
        onCollapseChange={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Bar (Optional) */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{getRoleDisplay(user.role)}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-main">
          <Outlet />
        </main>

        {/* Footer (Optional) */}
        <footer className="dashboard-footer">
          <p>© 2026 Quantum-Safe Banking System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

// Helper function to get page title from path
const getPageTitle = (pathname) => {
  const titles = {
    // ============================================================================
    // CUSTOMER ROUTES
    // ============================================================================
    "/dashboard": "Dashboard",
    "/customer/dashboard": "Dashboard",
    "/customer/accounts": "Account Summary",
    "/customer/beneficiaries": "Beneficiary Management",
    "/customer/transfer": "Transfer Money",
    "/customer/transactions": "Transaction History",
    "/statements/download": "Download Statement",
    "/customer/profile": "My Profile",
    "/profile/settings": "Profile Settings",
    "/customer/security": "Security Center",
    "/customer/certificates": "Certificate Request",
    "/customer/settings": "Account Settings",

    // ============================================================================
    // MANAGER ROUTES
    // ============================================================================
    "/manager/dashboard": "Manager Dashboard",
    "/manager/customers": "Customer Accounts",
    "/manager/kyc": "KYC Verification",
    "/manager/approvals/pending": "Pending Approvals",
    "/manager/approvals/history": "Approval History",
    "/manager/risk-assessment": "Risk Assessment",
    "/manager/monitoring": "Account Monitoring",
    "/manager/security-alerts": "Security Alerts",
    "/manager/encryption": "Encryption Status",
    "/manager/audit": "Audit Logs",
    "/manager/reports": "Reports",
    "/manager/certificates": "Certificate Management",
    "/manager/branch-audit": "Branch Audit",

    // ============================================================================
    // AUDITOR CLERK ROUTES
    // ============================================================================
    "/auditor/dashboard": "Audit Dashboard",
    "/auditor-clerk/dashboard": "Audit Dashboard",
    "/auditor/transactions": "Transaction Audit",
    "/auditor/activity": "Activity Logs",
    "/auditor/security-logs": "Security & Encryption Logs",
    "/auditor/integrity": "Data Integrity Verification",
    "/auditor/compliance": "Compliance Reports",
    "/auditor/suspicious": "Suspicious Activity Reports",
    "/auditor/export": "Export Audit Reports",
    "/auditor-clerk/audit-logs": "Audit Logs",
    "/auditor-clerk/audit-transactions": "Transaction Audit",
    "/auditor-clerk/audit-certificates": "Certificate Audit",
    "/auditor-clerk/audit-reports": "Audit Reports",
    "/auditor-clerk/profile": "Auditor Profile",

    // ============================================================================
    // SYSTEM ADMIN ROUTES
    // ============================================================================
    "/admin": "Admin Dashboard",
    "/admin/dashboard": "Admin Dashboard",
    "/admin/users": "User Management",
    "/admin/roles": "Role Management",
    "/admin/permissions": "Permission Management",
    "/admin/access-control": "Access Control & RBAC",
    "/admin/config": "System Configuration",
    "/admin/cryptography": "Cryptography Management",
    "/admin/certificates": "Certificate Management",
    "/admin/certificates/issue": "Issue Certificate",
    "/admin/certificates/crl": "CRL Management",
    "/admin/ca": "Certificate Authority",
    "/admin/security-policies": "Security Policies",
    "/admin/system-security": "System Security",
    "/admin/incidents": "Incident Response",
    "/admin/audit": "Global Audit Logs",
    "/admin/audit/global": "Global Audit",
    "/admin/backup": "Backup & Recovery",
    "/admin/monitoring": "System Monitoring",
    "/admin/rbac": "RBAC Management",
    "/admin/authority": "Authority Controls",
    "/admin/security-events": "Security Events",
    "/admin/session-management": "Session Management",

    // ============================================================================
    // SHARED/COMMON ROUTES
    // ============================================================================
    "/": "Home",
    "/login": "Login",
    "/logout": "Logout",
    "/signup": "Sign Up",
    "/public": "Welcome",
    "/profile": "Profile",
    "/settings": "Settings",
    "/transactions": "Transactions",
    "/transactions/create": "Create Transaction",
    "/transactions/history": "Transaction History",
    "/transactions/approvals": "Transaction Approvals",
    "/certificates": "Certificates",
  };

  return titles[pathname] || "PQC + RSA/ECC Banking System";
};

// Helper function to display role name
const getRoleDisplay = (role) => {
  const roleNames = {
    customer: "Customer",
    manager: "Manager",
    auditor_clerk: "Auditor Clerk",
    system_admin: "System Administrator",
  };

  return roleNames[role?.toLowerCase()] || role;
};

export default DashboardLayout;
