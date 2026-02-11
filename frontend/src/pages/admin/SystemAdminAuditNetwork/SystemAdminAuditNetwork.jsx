import { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import GlobalAuditFeed from "../GlobalAuditFeed";
import "./SystemAdminAuditNetwork.css";

const SystemAdminAuditNetwork = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  
  // Filters
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    actionType: "",
    dateFrom: "",
    dateTo: "",
  });

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...filters,
      };
      
      const response = await systemAdminService.getGlobalAuditFeed(params);
      
      setEntries(response.audits || response.entries || response.data || []);
      setTotalItems(response.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load audit feed.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      role: "",
      actionType: "",
      dateFrom: "",
      dateTo: "",
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <span className="material-icons text-indigo-600 dark:text-indigo-400">description</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Global Audit Logs
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  System-wide audit trail with advanced filtering
                </p>
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-lg">error</span>
                  {error}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={loadEntries}
            disabled={loading}
            className="h-fit rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-cyan-400/40 bg-cyan-500/10 text-cyan-700 hover:border-cyan-500 hover:bg-cyan-500/20 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:border-cyan-200 dark:hover:bg-cyan-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-icons text-lg">refresh</span>
                Refresh
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-icons text-slate-600 dark:text-slate-400">filter_list</span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Advanced Filters
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="User ID, action, path..."
              className="w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
            >
              <option value="">All Roles</option>
              <option value="system_admin">System Admin</option>
              <option value="manager">Manager</option>
              <option value="auditor_clerk">Auditor Clerk</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Action Type
            </label>
            <select
              value={filters.actionType}
              onChange={(e) => handleFilterChange("actionType", e.target.value)}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
            >
              <option value="">All Actions</option>
              <option value="login">Login/Logout</option>
              <option value="transaction">Transactions</option>
              <option value="certificate">Certificates</option>
              <option value="role">Role Changes</option>
              <option value="security">Security Events</option>
              <option value="policy">Policy Updates</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold transition border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons text-lg">clear</span>
                Clear Filters
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Feed */}
      <GlobalAuditFeed
        sectionId="sys-admin-audit-feed"
        entries={entries}
        onRefresh={loadEntries}
        loading={loading}
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />

      {/* Security Notice */}
      <div className="rounded-3xl border p-5 shadow-lg transition-all duration-300 border-blue-400/40 bg-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 dark:bg-blue-500/20">
            <span className="material-icons text-blue-600 dark:text-blue-300">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200">Audit Log Information</h4>
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>• All audit logs are immutable and append-only</p>
              <p>• Logs include cryptographic signatures for verification</p>
              <p>• Sensitive data is masked for security compliance</p>
              <p>• Admin access to audit logs is itself logged</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SystemAdminAuditNetwork;
