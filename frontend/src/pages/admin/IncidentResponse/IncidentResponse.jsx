import { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./IncidentResponse.css";

const IncidentResponse = () => {
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterSeverity !== "all") params.severity = filterSeverity;
      
      const [incidentsData, statsData] = await Promise.all([
        systemAdminService.getIncidents(params),
        systemAdminService.getIncidentStatistics(),
      ]);
      
      setIncidents(incidentsData.incidents || []);
      setStatistics(statsData);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setError(message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleDetectIncidents = async () => {
    try {
      setError("");
      await systemAdminService.detectIncidents();
      await loadIncidents();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setError(message || "Failed to detect incidents");
    }
  };

  const openActionModal = (incident, action) => {
    setSelectedIncident(incident);
    setActionType(action);
    setActionReason("");
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedIncident(null);
    setActionType("");
    setActionReason("");
  };

  const handleAction = async () => {
    if (!selectedIncident || !actionType) return;
    
    try {
      setActionLoading(true);
      setError("");
      
      switch (actionType) {
        case "lock":
          await systemAdminService.lockAccountIncident(
            selectedIncident.id,
            selectedIncident.affected_user_id,
            actionReason
          );
          break;
        case "unlock":
          await systemAdminService.unlockAccountIncident(
            selectedIncident.id,
            selectedIncident.affected_user_id,
            actionReason
          );
          break;
        case "resolve":
          await systemAdminService.updateIncidentStatus(
            selectedIncident.id,
            "resolved",
            actionReason
          );
          break;
        case "investigating":
          await systemAdminService.updateIncidentStatus(
            selectedIncident.id,
            "investigating",
            actionReason
          );
          break;
        default:
          break;
      }
      
      closeActionModal();
      await loadIncidents();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setError(message || "Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "rose";
      case "high":
        return "orange";
      case "medium":
        return "amber";
      case "low":
        return "blue";
      default:
        return "slate";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "rose";
      case "investigating":
        return "amber";
      case "resolved":
        return "emerald";
      case "closed":
        return "slate";
      default:
        return "slate";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "help_outline";
      default:
        return "help";
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (loading && incidents.length === 0) {
    return (
      <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading incidents...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <span className="material-icons text-rose-600 dark:text-rose-400">report_problem</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Incident Response
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage and respond to security incidents
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDetectIncidents}
              className="rounded-2xl border px-4 py-2 text-sm font-semibold transition border-purple-400/40 bg-purple-500/10 text-purple-700 hover:border-purple-500 hover:bg-purple-500/20 dark:border-purple-400/40 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-purple-200 dark:hover:bg-purple-500/20"
            >
              <span className="flex items-center gap-2">
                <span className="material-icons text-lg">search</span>
                Auto-Detect
              </span>
            </button>
            <button
              onClick={loadIncidents}
              disabled={loading}
              className="rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-cyan-400/40 bg-cyan-500/10 text-cyan-700 hover:border-cyan-500 hover:bg-cyan-500/20 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:border-cyan-200 dark:hover:bg-cyan-500/20"
            >
              <span className="flex items-center gap-2">
                <span className="material-icons text-lg">refresh</span>
                Refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <span className="material-icons text-lg">error</span>
            {error}
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <span className="material-icons text-rose-600 dark:text-rose-400">error</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Open Incidents</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.by_status?.open || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <span className="material-icons text-amber-600 dark:text-amber-400">search</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Investigating</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.by_status?.investigating || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <span className="material-icons text-orange-600 dark:text-orange-400">warning</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Critical</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.by_severity?.critical || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <span className="material-icons text-emerald-600 dark:text-emerald-400">check_circle</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Resolved</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.by_status?.resolved || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm transition border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Severity:</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm transition border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-slate-600 dark:text-slate-400">
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Security Incidents
        </h2>

        {incidents.length === 0 ? (
          <div className="py-12 text-center">
            <span className="material-icons text-6xl text-slate-300 dark:text-slate-700">check_circle</span>
            <p className="mt-4 text-slate-600 dark:text-slate-400">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <span className={`material-icons text-${getSeverityColor(incident.severity)}-600 dark:text-${getSeverityColor(incident.severity)}-400`}>
                        {getSeverityIcon(incident.severity)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {incident.incident_type}
                          </h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-${getSeverityColor(incident.severity)}-100 text-${getSeverityColor(incident.severity)}-700 dark:bg-${getSeverityColor(incident.severity)}-900/30 dark:text-${getSeverityColor(incident.severity)}-300`}>
                            {incident.severity}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(incident.status)}-100 text-${getStatusColor(incident.status)}-700 dark:bg-${getStatusColor(incident.status)}-900/30 dark:text-${getStatusColor(incident.status)}-300`}>
                            {incident.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                          {incident.description}
                        </p>
                        <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                          <div>
                            <span className="font-medium">Incident ID:</span> {incident.id}
                          </div>
                          {incident.affected_user_id && (
                            <div>
                              <span className="font-medium">Affected User:</span> {incident.affected_user_id}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Detected:</span> {formatTimestamp(incident.detected_at)}
                          </div>
                          {incident.resolved_at && (
                            <div>
                              <span className="font-medium">Resolved:</span> {formatTimestamp(incident.resolved_at)}
                            </div>
                          )}
                        </div>
                        {incident.action_history && incident.action_history.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Action History:</p>
                            <div className="mt-1 space-y-1">
                              {incident.action_history.map((action, idx) => (
                                <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                                  • {action.action} by {action.admin_id} at {formatTimestamp(action.timestamp)}
                                  {action.notes && ` - ${action.notes}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row">
                    {incident.status !== "resolved" && incident.status !== "closed" && (
                      <>
                        {incident.status === "open" && (
                          <button
                            onClick={() => openActionModal(incident, "investigating")}
                            className="rounded-xl border px-3 py-2 text-xs font-semibold transition border-amber-400/40 bg-amber-500/10 text-amber-700 hover:border-amber-500 hover:bg-amber-500/20 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
                          >
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-sm">search</span>
                              Investigate
                            </span>
                          </button>
                        )}
                        {incident.affected_user_id && (
                          <>
                            <button
                              onClick={() => openActionModal(incident, "lock")}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold transition border-rose-400/40 bg-rose-500/10 text-rose-700 hover:border-rose-500 hover:bg-rose-500/20 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
                            >
                              <span className="flex items-center gap-1">
                                <span className="material-icons text-sm">lock</span>
                                Lock Account
                              </span>
                            </button>
                            <button
                              onClick={() => openActionModal(incident, "unlock")}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold transition border-emerald-400/40 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-500/20 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
                            >
                              <span className="flex items-center gap-1">
                                <span className="material-icons text-sm">lock_open</span>
                                Unlock Account
                              </span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openActionModal(incident, "resolve")}
                          className="rounded-xl border px-3 py-2 text-xs font-semibold transition border-indigo-400/40 bg-indigo-500/10 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-500/20 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
                        >
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-sm">check_circle</span>
                            Resolve
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border p-6 shadow-2xl border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <span className="material-icons text-indigo-600 dark:text-indigo-400">
                  {actionType === "lock" ? "lock" : actionType === "unlock" ? "lock_open" : actionType === "resolve" ? "check_circle" : "search"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {actionType === "lock" && "Lock User Account"}
                {actionType === "unlock" && "Unlock User Account"}
                {actionType === "resolve" && "Resolve Incident"}
                {actionType === "investigating" && "Start Investigation"}
              </h3>
            </div>

            <div className="mb-4 rounded-2xl border p-3 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Incident:</span> {selectedIncident.incident_type}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">ID:</span> {selectedIncident.id}
              </p>
              {selectedIncident.affected_user_id && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">User:</span> {selectedIncident.affected_user_id}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason / Notes:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 text-sm transition border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Enter reason for this action..."
              />
            </div>

            {(actionType === "lock" || actionType === "resolve") && (
              <div className="mb-4 rounded-2xl border px-4 py-3 text-sm border-amber-400/40 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <span className="material-icons text-lg">warning</span>
                  <p>
                    {actionType === "lock" && "This will immediately lock the user's account and prevent access."}
                    {actionType === "resolve" && "This will mark the incident as resolved. Ensure all necessary actions have been taken."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeActionModal}
                disabled={actionLoading}
                className="flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !actionReason.trim()}
                className="flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-indigo-400/40 bg-indigo-500/10 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-500/20 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400"></span>
                    Processing...
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Notice */}
      <div className="rounded-3xl border p-5 shadow-lg transition-all duration-300 border-blue-400/40 bg-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 dark:bg-blue-500/20">
            <span className="material-icons text-blue-600 dark:text-blue-300">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200">Incident Response Guidelines</h4>
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>• All incident response actions require confirmation and are logged</p>
              <p>• Lock/unlock actions affect user account access immediately</p>
              <p>• Resolved incidents can be reopened if needed</p>
              <p>• Auto-detect scans security events for potential incidents</p>
              <p>• This page is restricted to System Administrator role only</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IncidentResponse;
