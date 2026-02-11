import { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./SystemMonitoring.css";

const SystemMonitoring = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const data = await systemAdminService.getMonitoringOverview();
      setOverview(data);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setError(message || "Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMonitoringData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadMonitoringData]);

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "emerald";
      case "degraded":
      case "warning":
        return "amber";
      case "critical":
        return "rose";
      default:
        return "slate";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
        return "check_circle";
      case "degraded":
      case "warning":
        return "warning";
      case "critical":
        return "error";
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

  if (loading && !overview) {
    return (
      <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading system monitoring...</span>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <span className="material-icons text-indigo-600 dark:text-indigo-400">monitor_heart</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  System Monitoring
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Real-time system health and performance metrics
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              Auto-refresh (30s)
            </label>
            <button
              onClick={loadMonitoringData}
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

      {overview && (
        <>
          {/* Overall Health Status */}
          {overview.health && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  System Health
                </h2>
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-${getStatusColor(overview.health.overall_status)}-100 text-${getStatusColor(overview.health.overall_status)}-700 dark:bg-${getStatusColor(overview.health.overall_status)}-900/30 dark:text-${getStatusColor(overview.health.overall_status)}-300`}>
                  <span className="material-icons text-lg">{getStatusIcon(overview.health.overall_status)}</span>
                  {overview.health.overall_status.charAt(0).toUpperCase() + overview.health.overall_status.slice(1)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Database */}
                {overview.health.components?.database && (
                  <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-blue-600 dark:text-blue-400">storage</span>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Database</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(overview.health.components.database.status)}-100 text-${getStatusColor(overview.health.components.database.status)}-700 dark:bg-${getStatusColor(overview.health.components.database.status)}-900/30 dark:text-${getStatusColor(overview.health.components.database.status)}-300`}>
                        <span className="material-icons text-xs">{getStatusIcon(overview.health.components.database.status)}</span>
                        {overview.health.components.database.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {overview.health.components.database.message}
                    </p>
                  </div>
                )}

                {/* Cryptography */}
                {overview.health.components?.cryptography && (
                  <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-purple-600 dark:text-purple-400">key</span>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cryptography</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(overview.health.components.cryptography.status)}-100 text-${getStatusColor(overview.health.components.cryptography.status)}-700 dark:bg-${getStatusColor(overview.health.components.cryptography.status)}-900/30 dark:text-${getStatusColor(overview.health.components.cryptography.status)}-300`}>
                        <span className="material-icons text-xs">{getStatusIcon(overview.health.components.cryptography.status)}</span>
                        {overview.health.components.cryptography.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {overview.health.components.cryptography.message}
                    </p>
                  </div>
                )}

                {/* Filesystem */}
                {overview.health.components?.filesystem && (
                  <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-emerald-600 dark:text-emerald-400">folder</span>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filesystem</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(overview.health.components.filesystem.status)}-100 text-${getStatusColor(overview.health.components.filesystem.status)}-700 dark:bg-${getStatusColor(overview.health.components.filesystem.status)}-900/30 dark:text-${getStatusColor(overview.health.components.filesystem.status)}-300`}>
                        <span className="material-icons text-xs">{getStatusIcon(overview.health.components.filesystem.status)}</span>
                        {overview.health.components.filesystem.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {overview.health.components.filesystem.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Metrics */}
          {overview.security && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-rose-600 dark:text-rose-400">security</span>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Security Metrics
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Failed Logins</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.security.failed_login_attempts || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Suspicious Activities</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.security.suspicious_activities || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Active Sessions</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.security.active_sessions || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Cert Revocations</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.security.certificate_revocations || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Policy Updates</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.security.policy_updates || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {overview.performance && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-cyan-600 dark:text-cyan-400">speed</span>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Performance Metrics
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Requests (Last Hour)</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.performance.requests_last_hour || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Requests/Minute</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.performance.requests_per_minute || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Total Audit Logs</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.performance.total_audit_logs || 0}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Security Events</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {overview.performance.total_security_events || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerts & Warnings */}
          {overview.alerts && (overview.alerts.total_alerts > 0 || overview.alerts.total_warnings > 0) && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-icons text-amber-600 dark:text-amber-400">notifications</span>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Alerts & Warnings
                </h2>
              </div>

              <div className="space-y-3">
                {/* Critical Alerts */}
                {overview.alerts.alerts?.map((alert, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border px-4 py-3 border-rose-400/40 bg-rose-500/10 dark:border-rose-500/40 dark:bg-rose-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-icons text-rose-600 dark:text-rose-400">error</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-200">
                            {alert.severity}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {alert.component}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          {formatTimestamp(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Warnings */}
                {overview.alerts.warnings?.map((warning, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border px-4 py-3 border-amber-400/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-icons text-amber-600 dark:text-amber-300">warning</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-200">
                            {warning.severity}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {warning.component}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                          {warning.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          {formatTimestamp(warning.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Alerts Message */}
          {overview.alerts && overview.alerts.total_alerts === 0 && overview.alerts.total_warnings === 0 && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <span className="material-icons text-emerald-600 dark:text-emerald-400 text-3xl">check_circle</span>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                    All Systems Operational
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    No alerts or warnings detected
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Information Notice */}
      <div className="rounded-3xl border p-5 shadow-lg transition-all duration-300 border-blue-400/40 bg-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 dark:bg-blue-500/20">
            <span className="material-icons text-blue-600 dark:text-blue-300">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200">Monitoring Information</h4>
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>• Metrics are read-only and do not expose sensitive system data</p>
              <p>• Auto-refresh polls every 30 seconds for real-time monitoring</p>
              <p>• All monitoring access is logged for security audit</p>
              <p>• This page is restricted to System Administrator role only</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SystemMonitoring;
