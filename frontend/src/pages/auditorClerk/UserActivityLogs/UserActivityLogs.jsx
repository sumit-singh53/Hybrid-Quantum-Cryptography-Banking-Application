import React, { useEffect, useState, useMemo } from "react";
import { fetchUserActivityLogs } from "../../../services/auditorClerkService";
import "./UserActivityLogs.css";

const UserActivityLogs = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [roleFilter, setRoleFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Modal states
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

  const loadActivityLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        role: roleFilter,
        eventType: eventTypeFilter,
        dateRange: dateRange,
      };
      
      const response = await fetchUserActivityLogs(filters);
      setActivities(response.activities || []);
      setStats(response.stats || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load user activity logs");
      console.error("Error loading activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivityLogs();
  }, [roleFilter, eventTypeFilter, dateRange]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadActivityLogs();
  };

  const handleClearFilters = () => {
    setRoleFilter("all");
    setEventTypeFilter("all");
    setDateRange("7d");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filter by search query
  const searchFilteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    
    const query = searchQuery.toLowerCase();
    return activities.filter(activity => 
      activity.user_id?.toLowerCase().includes(query) ||
      activity.user_name?.toLowerCase().includes(query) ||
      activity.role?.toLowerCase().includes(query) ||
      activity.event_type?.toLowerCase().includes(query) ||
      activity.ip_address?.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Sort activities
  const sortedActivities = useMemo(() => {
    if (!sortConfig.key) return searchFilteredActivities;
    
    return [...searchFilteredActivities].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchFilteredActivities, sortConfig]);

  // Paginate activities
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedActivities.slice(startIndex, endIndex);
  }, [sortedActivities, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = ["Timestamp", "User ID", "User Name", "Role", "Event Type", "IP Address", "Status"];
    const rows = sortedActivities.map(activity => [
      activity.timestamp || "",
      activity.user_id || "",
      activity.user_name || "",
      activity.role || "",
      activity.event_type || "",
      activity.ip_address || "",
      activity.status || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType?.toLowerCase()) {
      case "login":
        return "bg-emerald-100 text-emerald-700";
      case "logout":
        return "bg-slate-100 text-slate-700";
      case "failed_login":
      case "failed login":
        return "bg-rose-100 text-rose-700";
      case "password_change":
      case "password change":
        return "bg-amber-100 text-amber-700";
      case "profile_update":
      case "profile update":
        return "bg-indigo-100 text-indigo-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case "customer":
        return "bg-green-100 text-green-700";
      case "manager":
        return "bg-purple-100 text-purple-700";
      case "system_admin":
      case "admin":
        return "bg-red-100 text-red-700";
      case "auditor_clerk":
      case "auditor":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getRoleColor = (role) => {
    return getRoleBadgeColor(role);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "success":
        return "bg-emerald-100 text-emerald-700";
      case "failed":
      case "failure":
        return "bg-rose-100 text-rose-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const maskUserId = (userId) => {
    if (!userId) return "—";
    if (userId.length <= 8) return userId;
    return `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <p className="mt-2 text-base text-slate-600">
          Comprehensive read-only access to all user activity records with advanced filtering and compliance tracking.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-700">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Read-Only Access • No Modification Allowed
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Logins
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">
              {stats.total_logins || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Failed Attempts
            </p>
            <h3 className="mt-2 text-3xl font-bold text-rose-800">
              {stats.failed_attempts || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Active Sessions
            </p>
            <h3 className="mt-2 text-3xl font-bold text-emerald-800">
              {stats.active_sessions || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Unique Users
            </p>
            <h3 className="mt-2 text-3xl font-bold text-blue-800">
              {stats.unique_users || 0}
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
              placeholder="Search user ID, name, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">User Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="manager">Manager</option>
              <option value="system_admin">System Admin</option>
              <option value="auditor_clerk">Auditor Clerk</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Events</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="failed_login">Failed Login</option>
              <option value="password_change">Password Change</option>
              <option value="profile_update">Profile Update</option>
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
            disabled={sortedActivities.length === 0}
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

      {/* Activity Table */}
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
              <th className="px-5 py-4">User ID</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("user_name")}
              >
                User Name {sortConfig.key === "user_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("role")}
              >
                Role {sortConfig.key === "role" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("event_type")}
              >
                Event Type {sortConfig.key === "event_type" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">IP Address</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("status")}
              >
                Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="8">
                  Loading activity logs...
                </td>
              </tr>
            ) : paginatedActivities.length > 0 ? (
              paginatedActivities.map((activity, index) => (
                <tr key={`${activity.user_id}-${activity.timestamp}-${index}`} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {formatTimestamp(activity.timestamp)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-700">
                    {maskUserId(activity.user_id)}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {activity.user_name || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(activity.role)}`}>
                      {activity.role || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeColor(activity.event_type)}`}>
                      {activity.event_type || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">
                    {activity.ip_address || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(activity.status)}`}>
                      {activity.status || "success"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleViewDetails(activity)}
                      className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="8">
                  {searchQuery || roleFilter !== "all" || eventTypeFilter !== "all"
                    ? "No activity logs match the current filters."
                    : "No activity logs found."}
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
            Page {currentPage} of {totalPages} • Total: {sortedActivities.length} activities
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

      {/* Activity Detail Modal */}
      {showDetailModal && selectedActivity && (
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
                <h3 className="text-2xl font-semibold text-slate-50">Activity Details</h3>
                <p className="mt-1 text-sm text-slate-400">
                  User: {selectedActivity.user_name || selectedActivity.user_id}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read-Only View
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
              {/* User Information */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  User Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">User ID</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-200">
                      {selectedActivity.user_id || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">User Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {selectedActivity.user_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Role</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(selectedActivity.role)}`}>
                      {selectedActivity.role || "unknown"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedActivity.status)}`}>
                      {selectedActivity.status || "success"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Information */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Activity Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Event Type</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeColor(selectedActivity.event_type)}`}>
                      {selectedActivity.event_type || "unknown"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Timestamp</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {formatTimestamp(selectedActivity.timestamp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">IP Address</p>
                    <p className="mt-1 font-mono text-sm text-slate-200">
                      {selectedActivity.ip_address || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="rounded-xl border border-amber-700 bg-amber-900/20 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Compliance Notice</p>
                    <p className="mt-1 text-xs text-amber-200/80">
                      This is a read-only audit view. You cannot modify or delete activity logs. 
                      All access to user activity details is logged for compliance purposes.
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

export default UserActivityLogs;
