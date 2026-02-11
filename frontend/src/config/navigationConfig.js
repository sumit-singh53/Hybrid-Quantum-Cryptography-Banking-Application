/**
 * Centralized Navigation Configuration
 * Single source of truth for all role-based navigation links.
 * DO NOT hardcode navigation elsewhere - always import from here.
 */

// Navigation item structure:
// {
//   id: unique identifier
//   label: display text
//   path: route path
//   icon: icon name/component
//   requiredPermission: permission needed to see this link (optional)
//   requiredRole: specific role(s) needed (optional)
//   roles: array of roles that can see this link
// }

export const NAVIGATION_CONFIG = {
  // ========================================================================
  // 👤 CUSTOMER NAVIGATION
  // ========================================================================
  customer: [
    {
      id: "customer-dashboard",
      label: "Dashboard",
      path: "/customer/dashboard",
      icon: "dashboard",
      roles: ["customer"],
    },
    
    // Account Management Group
    {
      id: "account-group",
      label: "Account Management",
      icon: "account_balance_wallet",
      roles: ["customer"],
      isGroup: true,
      children: [
        {
          id: "account-summary",
          label: "Account Summary",
          path: "/customer/accounts",
          icon: "account_balance",
          roles: ["customer"],
          requiredPermission: "view_own_account",
        },
        {
          id: "download-statement",
          label: "Download Statement",
          path: "/statements/download",
          icon: "download",
          roles: ["customer"],
        },
        {
          id: "profile-settings",
          label: "Profile Settings",
          path: "/profile/settings",
          icon: "person",
          roles: ["customer"],
        },
      ],
    },
    
    // Transactions Group
    {
      id: "transactions-group",
      label: "Transactions",
      icon: "payments",
      roles: ["customer"],
      isGroup: true,
      children: [
        {
          id: "transfer-money",
          label: "Transfer Money",
          path: "/customer/transfer",
          icon: "send",
          roles: ["customer"],
          requiredPermission: "create_transaction",
        },
        {
          id: "transaction-history",
          label: "Transaction History",
          path: "/customer/transactions",
          icon: "history",
          roles: ["customer"],
          requiredPermission: "view_own_transactions",
        },
        {
          id: "beneficiary-management",
          label: "Manage Beneficiaries",
          path: "/customer/beneficiaries",
          icon: "people",
          roles: ["customer"],
        },
      ],
    },
    
    // Security & Certificates Group
    {
      id: "security-group",
      label: "Security & Certificates",
      icon: "security",
      roles: ["customer"],
      isGroup: true,
      children: [
        {
          id: "security-status",
          label: "Security Center",
          path: "/customer/security",
          icon: "shield",
          roles: ["customer"],
        },
        {
          id: "certificate-request",
          label: "Certificate Request",
          path: "/customer/certificates",
          icon: "workspace_premium",
          roles: ["customer"],
        },
      ],
    },
  ],

  // ========================================================================
  // 👔 MANAGER NAVIGATION
  // ========================================================================
  manager: [
    {
      id: "manager-dashboard",
      label: "Dashboard",
      path: "/manager/dashboard",
      icon: "dashboard",
      roles: ["manager"],
    },
    
    // Customer Management Group
    {
      id: "customer-management-group",
      label: "Customer Management",
      icon: "people",
      roles: ["manager"],
      isGroup: true,
      children: [
        {
          id: "customer-accounts",
          label: "Customer Accounts",
          path: "/manager/customers",
          icon: "account_circle",
          roles: ["manager"],
          requiredPermission: "view_all_customers",
        },
        {
          id: "kyc-verification",
          label: "KYC Verification",
          path: "/manager/kyc-verification",
          icon: "verified_user",
          roles: ["manager"],
        },
        {
          id: "account-monitoring",
          label: "Account Monitoring",
          path: "/manager/account-monitoring",
          icon: "monitor",
          roles: ["manager"],
        },
      ],
    },
    
    // Transaction Management Group
    {
      id: "transaction-management-group",
      label: "Transaction Management",
      icon: "payments",
      roles: ["manager"],
      isGroup: true,
      children: [
        {
          id: "pending-approvals",
          label: "Pending Approvals",
          path: "/manager/approvals/pending",
          icon: "pending_actions",
          roles: ["manager"],
          requiredPermission: "approve_transaction",
        },
        {
          id: "approved-rejected",
          label: "Approval History",
          path: "/manager/approvals/history",
          icon: "fact_check",
          roles: ["manager"],
        },
        {
          id: "risk-assessment",
          label: "Risk Assessment",
          path: "/manager/risk-assessment",
          icon: "assessment",
          roles: ["manager"],
        },
      ],
    },
    
    // Security & Compliance Group
    {
      id: "security-compliance-group",
      label: "Security & Compliance",
      icon: "security",
      roles: ["manager"],
      isGroup: true,
      children: [
        {
          id: "security-alerts",
          label: "Security Alerts",
          path: "/manager/security-alerts",
          icon: "warning",
          roles: ["manager"],
        },
        {
          id: "encryption-status",
          label: "Encryption Status",
          path: "/manager/encryption",
          icon: "enhanced_encryption",
          roles: ["manager"],
        },
        {
          id: "manager-certificates",
          label: "Certificates",
          path: "/manager/certificates",
          icon: "workspace_premium",
          roles: ["manager"],
        },
      ],
    },
    
    // Reports & Audit Group
    {
      id: "reports-audit-group",
      label: "Reports & Audit",
      icon: "analytics",
      roles: ["manager"],
      isGroup: true,
      children: [
        {
          id: "manager-reports",
          label: "Reports",
          path: "/manager/reports",
          icon: "bar_chart",
          roles: ["manager"],
          requiredPermission: "view_manager_reports",
        },
        {
          id: "manager-audit-logs",
          label: "Audit Logs",
          path: "/manager/audit",
          icon: "description",
          roles: ["manager"],
          requiredPermission: "view_branch_audit",
        },
        {
          id: "branch-audit",
          label: "Branch Audit",
          path: "/manager/branch-audit",
          icon: "store",
          roles: ["manager"],
        },
      ],
    },
  ],

  // ========================================================================
  // 🧾 AUDITOR CLERK NAVIGATION
  // ========================================================================
  auditor_clerk: [
    {
      id: "audit-dashboard",
      label: "Dashboard",
      path: "/auditor/dashboard",
      icon: "dashboard",
      roles: ["auditor_clerk"],
    },
    
    // Audit Logs & Monitoring Group
    {
      id: "audit-logs-group",
      label: "Audit Logs & Monitoring",
      icon: "description",
      roles: ["auditor_clerk"],
      isGroup: true,
      children: [
        {
          id: "transaction-audit",
          label: "Transaction Audit",
          path: "/auditor/transactions",
          icon: "receipt_long",
          roles: ["auditor_clerk"],
          requiredPermission: "view_all_transactions",
        },
        {
          id: "user-activity",
          label: "User Activity Logs",
          path: "/auditor/activity",
          icon: "timeline",
          roles: ["auditor_clerk"],
          requiredPermission: "view_all_audit_logs",
        },
        {
          id: "security-encryption-logs",
          label: "Security & Encryption Logs",
          path: "/auditor/security-logs",
          icon: "shield",
          roles: ["auditor_clerk"],
          requiredPermission: "view_security_events",
        },
      ],
    },
    
    // Verification & Compliance Group
    {
      id: "verification-compliance-group",
      label: "Verification & Compliance",
      icon: "verified",
      roles: ["auditor_clerk"],
      isGroup: true,
      children: [
        {
          id: "data-integrity",
          label: "Data Integrity Verification",
          path: "/auditor/integrity",
          icon: "fact_check",
          roles: ["auditor_clerk"],
          requiredPermission: "verify_transaction_integrity",
        },
        {
          id: "compliance-reports",
          label: "Compliance Reports",
          path: "/auditor/compliance",
          icon: "policy",
          roles: ["auditor_clerk"],
        },
        {
          id: "suspicious-activity",
          label: "Suspicious Activity Reports",
          path: "/auditor/suspicious",
          icon: "report_problem",
          roles: ["auditor_clerk"],
        },
      ],
    },
    
    // Reports & Export Group
    {
      id: "reports-export-group",
      label: "Reports & Export",
      icon: "analytics",
      roles: ["auditor_clerk"],
      isGroup: true,
      children: [
        {
          id: "export-reports",
          label: "Export Reports",
          path: "/auditor/export",
          icon: "file_download",
          roles: ["auditor_clerk"],
          requiredPermission: "export_audit_reports",
        },
      ],
    },
  ],

  // ========================================================================
  // 🛡️ SYSTEM ADMIN NAVIGATION (with dropdown groups)
  // ========================================================================
  system_admin: [
    {
      id: "admin-dashboard",
      label: "Admin Dashboard",
      path: "/admin/dashboard",
      icon: "admin_panel_settings",
      roles: ["system_admin"],
    },
    
    // User & Role Management Group
    {
      id: "user-role-group",
      label: "User & Role Management",
      icon: "people",
      roles: ["system_admin"],
      isGroup: true,
      children: [
        {
          id: "user-management",
          label: "User Management",
          path: "/admin/users",
          icon: "manage_accounts",
          roles: ["system_admin"],
          requiredPermission: "manage_users",
        },
        {
          id: "role-management",
          label: "Role Management",
          path: "/admin/roles",
          icon: "badge",
          roles: ["system_admin"],
          requiredPermission: "manage_roles",
        },
        {
          id: "access-control",
          label: "Access Control Policies",
          path: "/admin/access-control",
          icon: "policy",
          roles: ["system_admin"],
          requiredPermission: "manage_permissions",
        },
      ],
    },
    
    // Security & Certificates Group
    {
      id: "security-group",
      label: "Security & Certificates",
      icon: "security",
      roles: ["system_admin"],
      isGroup: true,
      children: [
        {
          id: "certificate-management",
          label: "Certificate Management",
          path: "/admin/certificates",
          icon: "workspace_premium",
          roles: ["system_admin"],
        },
        {
          id: "crypto-management",
          label: "Cryptography Management",
          path: "/admin/cryptography",
          icon: "key",
          roles: ["system_admin"],
        },
        {
          id: "security-policies",
          label: "Security Policies",
          path: "/admin/security-policies",
          icon: "shield",
          roles: ["system_admin"],
        },
      ],
    },
    
    // Monitoring & Audit Group
    {
      id: "monitoring-group",
      label: "Monitoring & Audit",
      icon: "analytics",
      roles: ["system_admin"],
      isGroup: true,
      children: [
        {
          id: "admin-audit-logs",
          label: "Audit Logs",
          path: "/admin/audit",
          icon: "description",
          roles: ["system_admin"],
          requiredPermission: "view_global_audit",
        },
        {
          id: "system-monitoring",
          label: "System Monitoring",
          path: "/admin/monitoring",
          icon: "monitor_heart",
          roles: ["system_admin"],
        },
        {
          id: "incident-response",
          label: "Incident Response",
          path: "/admin/incidents",
          icon: "emergency",
          roles: ["system_admin"],
        },
      ],
    },
    
    // System Configuration Group
    {
      id: "config-group",
      label: "System Configuration",
      icon: "settings",
      roles: ["system_admin"],
      isGroup: true,
      children: [
        {
          id: "system-config",
          label: "System Configuration",
          path: "/admin/config",
          icon: "tune",
          roles: ["system_admin"],
          requiredPermission: "manage_system_config",
        },
        {
          id: "backup-recovery",
          label: "Backup & Recovery",
          path: "/admin/backup",
          icon: "backup",
          roles: ["system_admin"],
        },
      ],
    },
  ],

  // ========================================================================
  // COMMON NAVIGATION (Available to all authenticated users)
  // ========================================================================
  common: [
    {
      id: "logout",
      label: "Logout",
      path: "/logout",
      icon: "logout",
      roles: ["customer", "manager", "auditor_clerk", "system_admin"],
    },
  ],
};

/**
 * Get navigation items for a specific role
 * @param {string} role - User's role
 * @returns {Array} Navigation items for the role
 */
export const getNavigationForRole = (role) => {
  if (!role) return [];
  
  const normalizedRole = role.toLowerCase();
  const roleNav = NAVIGATION_CONFIG[normalizedRole] || [];
  const commonNav = NAVIGATION_CONFIG.common || [];
  
  return [...roleNav, ...commonNav];
};

/**
 * Filter navigation items based on user permissions
 * @param {Array} navItems - Navigation items
 * @param {Array} userPermissions - User's permissions
 * @returns {Array} Filtered navigation items
 */
export const filterNavigationByPermissions = (navItems, userPermissions) => {
  if (!navItems || !Array.isArray(navItems)) return [];
  
  return navItems.filter((item) => {
    // If no permission required, show the item
    if (!item.requiredPermission) return true;
    
    // Check if user has the required permission
    if (!userPermissions || !Array.isArray(userPermissions)) return false;
    
    return userPermissions.includes(item.requiredPermission);
  });
};

/**
 * Check if a navigation item should be visible for a user
 * @param {Object} navItem - Navigation item
 * @param {string} userRole - User's role
 * @param {Array} userPermissions - User's permissions
 * @returns {boolean} Whether the item should be visible
 */
export const isNavigationItemVisible = (navItem, userRole, userPermissions) => {
  if (!navItem || !userRole) return false;
  
  const normalizedRole = userRole.toLowerCase();
  
  // Check if user's role is in the allowed roles
  if (navItem.roles && !navItem.roles.includes(normalizedRole)) {
    return false;
  }
  
  // Check if user has required permission
  if (navItem.requiredPermission) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    return userPermissions.includes(navItem.requiredPermission);
  }
  
  return true;
};

export default NAVIGATION_CONFIG;
