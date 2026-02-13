import { useEffect, useState, useMemo } from "react";
import { fetchSecurityEncryptionLogs } from "../../../services/auditorClerkService";
import "./SecurityEncryptionLogs.css";

const SecurityEncryptionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Modal states
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        category: categoryFilter,
        status: statusFilter,
        dateRange: dateRange,
      };
      
      const response = await fetchSecurityEncryptionLogs(filters);
      setLogs(response.logs || []);
      setStats(response.stats || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load security & encryption logs");
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, statusFilter, dateRange]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setDateRange("7d");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filter by search query
  const searchFilteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.event_type?.toLowerCase().includes(query) ||
      log.actor_role?.toLowerCase().includes(query) ||
      log.certificate_id?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    if (!sortConfig.key) return searchFilteredLogs;
    
    return [...searchFilteredLogs].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchFilteredLogs, sortConfig]);

  // Paginate logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedLogs.slice(startIndex, endIndex);
  }, [sortedLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = ["Timestamp", "Category", "Event Type", "Actor Role", "Status", "Algorithm", "Details"];
    const rows = sortedLogs.map(log => [
      log.timestamp || "",
      log.category || "",
      log.event_type || "",
      log.actor_role || "",
      log.status || "",
      log.algorithm || "N/A",
      log.details || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-encryption-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "security":
        return "bg-red-100 text-red-700";
      case "encryption":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "success":
        return "bg-emerald-100 text-emerald-700";
      case "failed":
      case "failure":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getEventTypeColor = (eventType) => {
    if (eventType?.includes("authentication")) {
      return "bg-blue-100 text-blue-700";
    } else if (eventType?.includes("certificate")) {
      return "bg-purple-100 text-purple-700";
    } else if (eventType?.includes("encrypt") || eventType?.includes("decrypt")) {
      return "bg-indigo-100 text-indigo-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const maskCertificateId = (certId) => {
    if (!certId) return "—";
    if (certId.length <= 12) return certId;
    return `${certId.substring(0, 6)}...${certId.substring(certId.length - 6)}`;
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <p className="mt-2 text-base text-slate-600">
          Comprehensive read-only access to security events and encryption operations with metadata-only visibility.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-700">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Read-Only Access • Metadata Only • No Key Material Exposed
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Events
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">
              {stats.total_events || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Security Events
            </p>
            <h3 className="mt-2 text-3xl font-bold text-red-800">
              {stats.security_events || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Encryption Events
            </p>
            <h3 className="mt-2 text-3xl font-bold text-purple-800">
              {stats.encryption_events || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Failures
            </p>
            <h3 className="mt-2 text-3xl font-bold text-rose-800">
              {(stats.authentication_failures || 0) + (stats.encryption_failures || 0)}
            </h3>
          </div>
        </section>
      )}

      {/* Advanced Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
          Advanced Filters
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Search</label>
            <input
              type="text"
              placeholder="Search event type, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Categories</option>
              <option value="security">Security</option>
              <option value="encryption">Encryption</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Applying..." : "Apply Filters"}
          </button>
          <button
            onClick={handleClearFilters}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
          >
            Clear Filters
          </button>
          <button
            onClick={exportToCSV}
            disabled={sortedLogs.length === 0}
            className="ml-auto rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700">
            <tr>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("timestamp")}
              >
                Timestamp {sortConfig.key === "timestamp" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("category")}
              >
                Category {sortConfig.key === "category" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("event_type")}
              >
                Event Type {sortConfig.key === "event_type" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Actor Role</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("status")}
              >
                Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Algorithm</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="7">
                  Loading logs...
                </td>
              </tr>
            ) : paginatedLogs.length > 0 ? (
              paginatedLogs.map((log, index) => (
                <tr key={`${log.timestamp}-${index}`} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(log.category)}`}>
                      {log.category || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeColor(log.event_type)}`}>
                      {log.event_type || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {log.actor_role || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(log.status)}`}>
                      {log.status || "success"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">
                    {log.algorithm || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleViewDetails(log)}
                      className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="7">
                  {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                    ? "No logs match the current filters."
                    : "No logs found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">
            Page {currentPage} of {totalPages} • Total: {sortedLogs.length} logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Algorithm Usage Summary */}
      {stats && stats.algorithm_usage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
            Algorithm Usage Summary (Metadata Only)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(stats.algorithm_usage).map(([algorithm, count]) => (
              <div key={algorithm} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {algorithm}
                </p>
                <h4 className="mt-2 text-2xl font-bold text-slate-800">
                  {count}
                </h4>
                <p className="mt-1 text-xs text-slate-600">operations</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Security Notice</p>
                <p className="mt-1 text-xs text-amber-700">
                  Algorithm indicators show usage metadata only. No cryptographic parameters, key material, or internal implementation details are exposed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" 
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-50">Log Details</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedLog.event_type}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read-Only View • Metadata Only
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Event Information */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Event Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Timestamp</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {formatTimestamp(selectedLog.timestamp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Category</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(selectedLog.category)}`}>
                      {selectedLog.category || "unknown"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Event Type</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeColor(selectedLog.event_type)}`}>
                      {selectedLog.event_type || "unknown"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status || "success"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actor Information */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Actor Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Actor Role</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {selectedLog.actor_role || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Certificate ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-200">
                      {maskCertificateId(selectedLog.certificate_id)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic Information (Metadata Only) */}
              {selectedLog.category === "encryption" && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Cryptographic Information (Metadata Only)
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Algorithm Indicator</p>
                      <p className="mt-1 font-mono text-sm text-slate-200">
                        {selectedLog.algorithm || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Operation Status</p>
                      <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedLog.status)}`}>
                        {selectedLog.status || "success"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedLog.details && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                  <p className="text-xs font-medium text-slate-500">Details</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedLog.details}</p>
                </div>
              )}

              {/* Security Notice */}
              <div className="rounded-xl border border-amber-700 bg-amber-900/20 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Security & Compliance Notice</p>
                    <p className="mt-1 text-xs text-amber-200/80">
                      This is a read-only audit view showing metadata only. No cryptographic keys, secrets, or internal parameters are exposed. 
                      You cannot modify or delete logs. All access is logged for compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityEncryptionLogs;
