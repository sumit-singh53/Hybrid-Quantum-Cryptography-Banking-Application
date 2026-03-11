import React, { useEffect, useState } from "react";
import {
  fetchManagerAuditLogs,
  fetchAuditLogStatistics,
} from "../../../services/managerService";
import "./ManagerAuditLogs.css";

const ManagerAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: "",
    date_from: "",
    date_to: "",
    limit: 100,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        fetchManagerAuditLogs(filters),
        fetchAuditLogStatistics(),
      ]);
      setLogs(logsData);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      action_type: "",
      date_from: "",
      date_to: "",
      limit: 100,
    });
    setTimeout(() => loadData(), 100);
  };

  const getActionBadgeClass = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("approve")) return "action-approve";
    if (actionLower.includes("reject")) return "action-reject";
    if (actionLower.includes("verify")) return "action-verify";
    if (actionLower.includes("revoke")) return "action-revoke";
    return "bg-slate-100 text-slate-700";
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading audit logs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-audit-logs-container space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Read-only view of managerial actions and decisions
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}

      {/* Read-Only Indicator */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Read-Only / Supervisory Access
            </p>
            <p className="text-xs text-blue-700">
              Audit logs cannot be edited or deleted. Manager scope only.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Manager Actions
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">
              {statistics.total_manager_actions}
            </h3>
          </div>
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent Actions (7d)
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">
              {statistics.recent_actions_7d}
            </h3>
          </div>
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approval Actions
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">
              {statistics.approval_actions}
            </h3>
          </div>
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              KYC Actions
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">
              {statistics.kyc_actions}
            </h3>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="filter-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Action Type
            </label>
            <input
              type="text"
              value={filters.action_type}
              onChange={(e) => handleFilterChange("action_type", e.target.value)}
              placeholder="e.g., approve, reject"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Limit
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange("limit", parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={applyFilters}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* Audit Logs Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Audit Log Entries
          </h3>
          <p className="text-sm text-slate-600">
            Showing {logs.length} entries
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.event_id} className="audit-log-row">
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.role_masked}</td>
                  <td className="px-4 py-3 text-slate-700">{log.method}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit logs found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> This view shows only manager-scoped actions including
          transaction approvals/rejections, KYC verifications, account status updates,
          and certificate management. System-wide audit logs and cryptographic operations
          are not visible to managers.
        </p>
      </div>
    </div>
  );
};

export default ManagerAuditLogs;
