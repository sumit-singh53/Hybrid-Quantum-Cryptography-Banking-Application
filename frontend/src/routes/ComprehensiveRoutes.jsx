/**
 * Comprehensive Routes Configuration
 * Complete routing for all roles with new RBAC-based navigation
 */
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/common/ProtectedRoute";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";

// Auth Pages
import Login from "../components/auth/Login";
import CustomerSignup from "../components/auth/CustomerSignup";
import Logout from "../components/auth/Logout";

// Public Pages
import PublicLanding from "../pages/public/PublicLanding";

// Shared/Universal Pages
import UniversalDashboard from "../pages/shared/UniversalDashboard";

// Customer Pages
import AccountsOverview from "../pages/customer/AccountsOverview";
import TransactionHistory from "../pages/customer/TransactionHistory";
import SecurityCenter from "../pages/customer/SecurityCenter";
import ProfileSwitcher from "../pages/customer/ProfileSwitcher";
import ProfileSettings from "../pages/customer/ProfileSettings";
import CreateTransaction from "../pages/customer/CreateTransaction";
import BeneficiaryManagement from "../pages/customer/BeneficiaryManagement";

// Manager Pages
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import ManagerCustomers from "../pages/manager/ManagerCustomers";
import ApproveTransaction from "../pages/manager/ApproveTransaction";
import ManagerCertificates from "../pages/manager/ManagerCertificates";
import ManagerReports from "../pages/manager/ManagerReports";
import ManagerAuditLogs from "../pages/manager/ManagerAuditLogs";
import BranchAudit from "../pages/manager/BranchAudit";
import KYCVerification from "../pages/manager/KYCVerification";
import CustomerAccounts from "../pages/manager/CustomerAccounts";
import AccountMonitoring from "../pages/manager/AccountMonitoring";

// Auditor Clerk Pages
import AuditorClerkDashboard from "../pages/auditorClerk/AuditorClerkDashboard";
import AuditTransactions from "../pages/auditorClerk/AuditTransactions/AuditTransactions";
import AuditLogs from "../pages/auditorClerk/AuditLogs";
import AuditCertificates from "../pages/auditorClerk/AuditCertificates";
import AuditReports from "../pages/auditorClerk/AuditReports";
import UserActivityLogs from "../pages/auditorClerk/UserActivityLogs";
import SecurityEncryptionLogs from "../pages/auditorClerk/SecurityEncryptionLogs";
import DataIntegrityVerification from "../pages/auditorClerk/DataIntegrityVerification";
import ComplianceReports from "../pages/auditorClerk/ComplianceReports";
import SuspiciousActivityReports from "../pages/auditorClerk/SuspiciousActivityReports";
import ExportReports from "../pages/auditorClerk/ExportReports";

// System Admin Pages
import SystemAdminDashboard from "../pages/admin/SystemAdminDashboard";
import SystemAdminUserInventory from "../pages/admin/SystemAdminUserInventory";
import SystemAdminRoleManagement from "../pages/admin/SystemAdminRoleManagement";
import SystemAdminCertificateStudio from "../pages/admin/SystemAdminCertificateStudio";
import SystemAdminCrlCenter from "../pages/admin/SystemAdminCrlCenter";
import SystemAdminAuthorityHub from "../pages/admin/SystemAdminAuthorityHub";
import SystemAdminSecurityOps from "../pages/admin/SystemAdminSecurityOps";
import SystemAdminAuditNetwork from "../pages/admin/SystemAdminAuditNetwork";
import SystemMonitoring from "../pages/admin/SystemMonitoring";
import RBACManagement from "../pages/admin/RBACManagement";
import IncidentResponse from "../pages/admin/IncidentResponse";
import SystemConfiguration from "../pages/admin/SystemConfiguration";
import BackupRecovery from "../pages/admin/BackupRecovery";
import DownloadStatement from "../pages/customer/DownloadStatement/DownloadStatement";
import CertificateRequest from "../pages/customer/CertificateRequest";
import CertificateManagement from "../pages/admin/CertificateManagement";
import ApprovalHistory from "../pages/manager/ApprovalHistory";
import TransactionRiskAssessment from "../pages/manager/TransactionRiskAssessment";
import SecurityAlerts from "../pages/manager/SecurityAlerts";
import EncryptionStatus from "../pages/manager/EncryptionStatus";
import CertificateOverview from "../pages/manager/CertificateOverview";

const ComprehensiveRoutes = () => {
  const { isAuthenticated, isVerifyingSession, user } = useAuth();

  // Get dashboard route based on role
  const getDashboardRoute = () => {
    if (!user || !user.role) return "/login";
    
    const role = user.role.toLowerCase();
    switch (role) {
      case "customer":
        return "/customer/dashboard";
      case "manager":
        return "/manager/dashboard";
      case "auditor_clerk":
        return "/auditor/dashboard";
      case "system_admin":
        return "/admin/dashboard";
      default:
        return "/dashboard";
    }
  };

  // Loading state
  if (isVerifyingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <PublicLanding />
          )
        }
      />
      
      <Route path="/public" element={<PublicLanding />} />
      
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <Login />
          )
        }
      />
      
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <CustomerSignup />
          )
        }
      />
      
      <Route path="/logout" element={<Logout />} />

      {/* Protected Routes with Dashboard Layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Universal Dashboard (works for all roles) */}
        <Route path="/dashboard" element={<UniversalDashboard />} />

        {/* ================================================================
            👤 CUSTOMER ROUTES
            ================================================================ */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <UniversalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/accounts"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <AccountsOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/beneficiaries"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <BeneficiaryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/transfer"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CreateTransaction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/transactions"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statements/download"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <DownloadStatement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/security"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <SecurityCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ProfileSwitcher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/settings"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/certificates"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CertificateRequest />
            </ProtectedRoute>
          }
        />

        {/* ================================================================
            👔 MANAGER ROUTES
            ================================================================ */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/customers"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/kyc"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <KYCVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/kyc-verification"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <KYCVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/account-monitoring"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <AccountMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/accounts"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <CustomerAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/customer-accounts"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <CustomerAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/approvals/pending"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ApproveTransaction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/approvals/history"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ApprovalHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/risk-assessment"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <TransactionRiskAssessment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/account-monitoring"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <AccountMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/security-alerts"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <SecurityAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/encryption"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <EncryptionStatus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/certificates"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <CertificateOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/audit"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerAuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/branch-audit"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <BranchAudit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerReports />
            </ProtectedRoute>
          }
        />

        {/* ================================================================
            🧾 AUDITOR CLERK ROUTES
            ================================================================ */}
        <Route
          path="/auditor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditorClerkDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/transactions"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/activity"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <UserActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/security-logs"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <SecurityEncryptionLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/integrity"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <DataIntegrityVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/compliance"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <ComplianceReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/suspicious"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <SuspiciousActivityReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor/export"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <ExportReports />
            </ProtectedRoute>
          }
        />

        {/* ================================================================
            🛡️ SYSTEM ADMIN ROUTES
            ================================================================ */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminUserInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminRoleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/access-control"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <RBACManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/config"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemConfiguration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <CertificateManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cryptography"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminAuthorityHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminCertificateStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security-policies"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminSecurityOps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/incidents"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <IncidentResponse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitoring"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminAuditNetwork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <BackupRecovery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitoring"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <div className="p-8">
                <h1 className="text-2xl font-bold text-white">System Monitoring</h1>
                <p className="text-slate-400 mt-2">Monitor system health and performance.</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Unauthorized */}
        <Route
          path="/unauthorized"
          element={
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold text-red-600">Unauthorized Access 🚫</h1>
              <p className="text-slate-600 mt-4">You don't have permission to access this page.</p>
            </div>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold">404 - Page Not Found</h1>
              <p className="text-slate-600 mt-4">The page you're looking for doesn't exist.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
};

export default ComprehensiveRoutes;
