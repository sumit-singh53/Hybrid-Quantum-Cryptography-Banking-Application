/**
 * Navigation Helper Utility
 * Updates the admin navbar breadcrumb when navigation links are clicked
 */

/**
 * Update the admin navbar breadcrumb
 * @param {string} pageName - The name to display in the breadcrumb (e.g., "User Management", "Dashboard")
 */
export const updateAdminBreadcrumb = (pageName) => {
  // Save to sessionStorage for persistence across refreshes
  sessionStorage.setItem('currentAdminPage', pageName);
  
  // Dispatch custom event for navbar to listen
  const event = new CustomEvent('adminNavigation', {
    detail: { pageName }
  });
  window.dispatchEvent(event);
};

/**
 * Get current breadcrumb from storage
 * @returns {string} - Current page name or default
 */
export const getCurrentBreadcrumb = () => {
  return sessionStorage.getItem('currentAdminPage') || 'Dashboard';
};

/**
 * Get page name from route path
 * @param {string} path - The route path
 * @returns {string} - Readable page name
 */
export const getPageNameFromPath = (path) => {
  const routeMap = {
    '/admin': 'Dashboard',
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/certificates/issue': 'Issue Certificate',
    '/admin/certificates/crl': 'CRL Management',
    '/admin/roles': 'Role Management',
    '/admin/audit/global': 'Global Audit',
    '/admin/security': 'Security Center',
    '/admin/rbac': 'RBAC Management',
    '/admin/authority': 'Authority Controls',
  };

  return routeMap[path] || path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';
};

/**
 * Enhanced navigation function that updates breadcrumb
 * @param {string} path - The route path to navigate to
 * @param {string} pageName - Optional custom page name (auto-generated if not provided)
 */
export const navigateWithBreadcrumb = (path, pageName = null) => {
  const displayName = pageName || getPageNameFromPath(path);
  updateAdminBreadcrumb(displayName);
  window.location.href = path;
};
