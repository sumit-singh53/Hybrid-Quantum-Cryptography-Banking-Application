import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import ProtectedRoute from "../components/common/ProtectedRoute";

/* Auth */
import Login from "../components/auth/Login";
import CustomerSignup from "../components/auth/CustomerSignup";

/* Dashboards */
import DashboardSwitcher from "../pages/shared/DashboardSwitcher";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import AccountsOverview from "../pages/customer/AccountsOverview";
import ProfileSwitcher from "../pages/customer/ProfileSwitcher";
import SecurityCenter from "../pages/customer/SecurityCenter";
import BeneficiaryManagement from "../pages/customer/BeneficiaryManagement";
import ManagerCustomers from "../pages/manager/ManagerCustomers";
import ManagerCertificates from "../pages/manager/ManagerCertificates";
import ManagerReports from "../pages/manager/ManagerReports";
import BranchAudit from "../pages/manager/BranchAudit";
import KYCVerification from "../pages/manager/KYCVerification";
import CustomerAccounts from "../pages/manager/CustomerAccounts";
import AccountMonitoring from "../pages/manager/AccountMonitoring"; // Account Monitoring Page

/* Common */
import PublicHeader from "../components/public/PublicHeader";
import CustomerNavbar from "../components/common/CustomerNavbar";
import ClerkNavbar from "../components/common/ClerkNavbar";
import ManagerNavbar from "../components/common/ManagerNavbar";
import AdminNavbar from "../components/common/AdminNavbar";
import LeftSidebar from "../components/common/LeftSidebar";
import Footer from "../components/common/Footer";
import PublicLanding from "../pages/public/PublicLanding";
import TransactionHistory from "../pages/customer/TransactionHistory";
import ApproveTransaction from "../pages/manager/ApproveTransaction";
import ApprovalHistory from "../pages/manager/ApprovalHistory";
import TransactionRiskAssessment from "../pages/manager/TransactionRiskAssessment";
import TransactionDetails from "../pages/shared/TransactionDetails";
import Logout from "../components/auth/Logout";
import AuditTransactions from "../pages/auditorClerk/AuditTransactions/AuditTransactions";
import AuditLogs from "../pages/auditorClerk/AuditLogs";
import AuditCertificates from "../pages/auditorClerk/AuditCertificates";
import AuditReports from "../pages/auditorClerk/AuditReports";
import SystemAdminDashboard from "../pages/admin/SystemAdminDashboard";
import SystemAdminUserInventory from "../pages/admin/SystemAdminUserInventory";
import SystemAdminRoleManagement from "../pages/admin/SystemAdminRoleManagement";
import SystemAdminCertificateStudio from "../pages/admin/SystemAdminCertificateStudio";
import SystemAdminCrlCenter from "../pages/admin/SystemAdminCrlCenter";
import SystemAdminAuthorityHub from "../pages/admin/SystemAdminAuthorityHub";
import SystemAdminSecurityOps from "../pages/admin/SystemAdminSecurityOps";
import SystemAdminAuditNetwork from "../pages/admin/SystemAdminAuditNetwork";
import SystemMonitoring from "../pages/admin/SystemMonitoring";
import CreateTransaction from "../pages/customer/CreateTransaction/CreateTransaction";
import DownloadStatement from "../pages/customer/DownloadStatement";
import ProfileSettings from "../pages/customer/ProfileSettings";
import CertificateRequest from "../pages/customer/CertificateRequest";

const AuthenticatedLayout = ({ isAuthenticated }) => {
  const { role } = useRole();

  // Determine which navbar to show
  let NavbarComponent = null;
  if (!isAuthenticated) {
    NavbarComponent = PublicHeader;
  } else {
    switch (role) {
      case "customer":
        NavbarComponent = CustomerNavbar;
        break;
      case "auditor_clerk":
        NavbarComponent = ClerkNavbar;
        break;
      case "manager":
        NavbarComponent = ManagerNavbar;
        break;
      case "system_admin":
        NavbarComponent = AdminNavbar;
        break;
      default:
        NavbarComponent = PublicHeader;
    }
  }

  const isAdminPanel = role === 'system_admin';

  return (
    <div className={`relative flex min-h-screen flex-col text-slate-900 overflow-hidden ${
      isAdminPanel 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-50 via-cyan-50/20 to-white'
    }`}>
      {/* Ambient Background Effects for Admin Panel */}
      {isAdminPanel && (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="fixed left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
        </>
      )}
      
      <NavbarComponent />
      <div className="relative flex-1 z-10">
        <div className="flex w-full flex-col gap-6 px-0 pb-8 pt-0 sm:pr-4 sm:pt-0 lg:flex-row lg:items-start lg:gap-8 lg:pl-0 lg:pr-8 lg:pt-0">
          {isAuthenticated && <LeftSidebar />}

          <main className={`mt-4 flex-1 rounded-[32px] border p-4 shadow-2xl backdrop-blur-xl lg:mt-6 lg:p-8 ${
            isAdminPanel
              ? 'border-slate-800/50 bg-slate-950/80 text-slate-100 shadow-indigo-500/10'
              : 'border-slate-100 bg-white/90 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'
          }`}>
            <Outlet />
          </main>
        </div>
      </div>
      {role === 'manager' ? (
        <footer className="relative z-10 w-full border-t border-slate-200/60 bg-white/80 backdrop-blur-sm py-4 mt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 sm:flex-row">
              <p>© {new Date().getFullYear()} PQ Banking. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-500">Secure Operations • Post-Quantum Protected</span>
                <span className="text-xs text-slate-400">v1.0.0</span>
              </div>
            </div>
          </div>
        </footer>
      ) : (
        <Footer />
      )}
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, isVerifyingSession } = useAuth();
  const { role } = useRole();
  const authenticatedRoles = [
    "customer",
    "manager",
    "auditor_clerk",
    "system_admin",
  ];

  /**
   * Redirect user to their respective dashboard
   */
  const getDashboardByRole = () => {
    switch (role) {
      case "customer":
        return "/dashboard";
      case "auditor_clerk":
        return "/dashboard";
      case "manager":
        return "/manager/dashboard";
      case "system_admin":
        return "/admin/dashboard";
      default:
        return "/login";
    }
  };

  if (isVerifyingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-slate-600">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-2xl shadow-cyan-500/10">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
            Session attestation
          </p>
          <p className="mt-4 text-lg font-semibold text-slate-900">
            Running server session checks…
          </p>
          <p className="mt-2 text-sm text-slate-500">
            We are validating your certificate binding, CRL status, and device
            fingerprint.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardByRole()} replace />
          ) : (
            <PublicLanding />
          )
        }
      />
      <Route path="/public" element={<PublicLanding />} />

      <Route
        element={<AuthenticatedLayout isAuthenticated={isAuthenticated} />}
      >
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardByRole()} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardByRole()} replace />
            ) : (
              <CustomerSignup />
            )
          }
        />
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        {/* Dashboards */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer", "auditor_clerk"]}>
              <DashboardSwitcher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/customer"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard/auditor-clerk"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Auditor Clerk & Reports */}
        <Route
          path="/audit/transactions"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit/logs"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit/certificates"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["auditor_clerk"]}>
              <AuditReports />
            </ProtectedRoute>
          }
        />

        {/* Transactions */}
        <Route
          path="/transactions/create"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CreateTransaction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/history"
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
          path="/accounts"
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
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["customer", "auditor_clerk"]}>
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
        <Route
          path="/security"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <SecurityCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/approvals"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ApproveTransaction />
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
          path="/manager/customers"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/certificates"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerCertificates />
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
        <Route
          path="/manager/branch-audit"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <BranchAudit />
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
        {/* System Admin */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
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
          path="/admin/certificates/issue"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminCertificateStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates/crl"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminCrlCenter />
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
          path="/admin/system-security"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminSecurityOps />
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
          path="/admin/audit/global"
          element={
            <ProtectedRoute allowedRoles={["system_admin"]}>
              <SystemAdminAuditNetwork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/:id"
          element={
            <ProtectedRoute allowedRoles={authenticatedRoles}>
              <TransactionDetails />
            </ProtectedRoute>
          }
        />

        {/* Unauthorized */}
        <Route
          path="/unauthorized"
          element={
            <h3 className="font-semibold text-rose-400">
              Unauthorized Access 🚫
            </h3>
          }
        />

        <Route path="/logout" element={<Logout />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <ProtectedRoute allowedRoles={authenticatedRoles}>
              <h3>404 - Page Not Found</h3>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

