import React, { useEffect, useState } from "react";
import { fetchSuspiciousActivityReports, exportSuspiciousActivityReport } from "../../../services/auditorClerkService";
import "./SuspiciousActivityReports.css";

const SuspiciousActivityReports = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    severity: "all",
    status: "all",
    dateRange: "30d",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSuspiciousActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadSuspiciousActivities = async () => {
    setLoading(true);
    try {
      const data = await fetchSuspiciousActivityReports(filters);
      setActivities(data.activities || []);
      setStats(data.stats || {});
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load suspicious activity reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const { data, filename, mimeType, binary } = await exportSuspiciousActivityReport(format, filters);
      
      if (binary) {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-lg text-slate-600">Loading suspicious activity reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">


      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <section className="grid gap-6 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Flagged
            </p>
            <h3 className="mt-4 text-4xl font-bold text-slate-900">
              {stats.total_flagged || 0}
            </h3>
            <p className="mt-2 text-sm text-slate-600">Last 30 days</p>
          </article>

          <article className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Critical Alerts
            </p>
            <h3 className="mt-4 text-4xl font-bold text-rose-600">
              {stats.critical_alerts || 0}
            </h3>
            <p className="mt-2 text-sm text-rose-600">Immediate attention</p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Under Investigation
            </p>
            <h3 className="mt-4 text-4xl font-bold text-amber-600">
              {stats.under_investigation || 0}
            </h3>
            <p className="mt-2 text-sm text-amber-600">Active cases</p>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Resolved
            </p>
            <h3 className="mt-4 text-4xl font-bold text-emerald-600">
              {stats.resolved || 0}
            </h3>
            <p className="mt-2 text-sm text-emerald-600">This month</p>
          </article>
        </section>
      )}

      {/* Filters and Export */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange("severity", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {["pdf", "csv"].map((format) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={exporting}
                className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Suspicious Activities List */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-900">
          Flagged Activities <span className="text-slate-500">(read-only)</span>
        </h3>
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-sm font-medium text-emerald-700">
              No suspicious activities found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                className={`rounded-3xl border p-6 shadow-lg transition-all hover:shadow-xl ${getSeverityColor(
                  activity.severity
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${getSeverityColor(
                          activity.severity
                        )}`}
                      >
                        {activity.severity}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(activity.detected_at).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="mt-3 text-lg font-bold text-slate-900">
                      {activity.title}
                    </h4>
                    <p className="mt-2 text-sm text-slate-700">
                      {activity.description}
                    </p>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      {activity.user_id && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            User ID:
                          </span>{" "}
                          <span className="font-mono text-xs text-slate-600">
                            {activity.user_id}
                          </span>
                        </div>
                      )}
                      {activity.transaction_id && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            Transaction ID:
                          </span>{" "}
                          <span className="font-mono text-xs text-slate-600">
                            {activity.transaction_id}
                          </span>
                        </div>
                      )}
                      {activity.ip_address && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            IP Address:
                          </span>{" "}
                          <span className="font-mono text-xs text-slate-600">
                            {activity.ip_address}
                          </span>
                        </div>
                      )}
                      {activity.amount && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            Amount:
                          </span>{" "}
                          <span className="text-slate-900">
                            ₹ {Number(activity.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                    {activity.indicators && activity.indicators.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Risk Indicators:
                        </p>
                        <ul className="mt-2 space-y-1">
                          {activity.indicators.map((indicator, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-slate-700 flex items-start gap-2"
                            >
                              <span className="text-rose-600">•</span>
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        activity.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : activity.status === "investigating"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SuspiciousActivityReports;
