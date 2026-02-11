import React, { useEffect, useState } from "react";
import {
  fetchManagerReports,
  submitEscalation,
} from "../../../services/managerService";
import "./ManagerReports.css";

const ManagerReports = () => {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    severity: "medium",
  });
  const [success, setSuccess] = useState(null);
  const [reportType, setReportType] = useState("summary");
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });

  const loadReports = async () => {
    try {
      const data = await fetchManagerReports();
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load reports");
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) {
      setError("Subject and description are required");
      return;
    }
    try {
      await submitEscalation({ ...form });
      setSuccess("Escalation filed to security desk");
      setForm({ subject: "", description: "", severity: "medium" });
      loadReports();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to escalate");
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (!reports) return;

    // Prepare CSV data
    const csvRows = [];
    csvRows.push(["Manager Reports - Transaction Summary"]);
    csvRows.push([]);
    csvRows.push(["Metric", "Value"]);
    
    Object.entries(reports.volume_summary || {}).forEach(([key, value]) => {
      csvRows.push([key.replace(/_/g, " ").toUpperCase(), value]);
    });

    csvRows.push([]);
    csvRows.push(["Branch Health Report"]);
    csvRows.push(["Branch", "Pending", "Stale", "Avg Risk", "Risk Level"]);
    
    (reports.branch_health || []).forEach((branch) => {
      csvRows.push([
        branch.label,
        branch.pending,
        branch.stale,
        branch.avg_risk,
        branch.risk_level,
      ]);
    });

    // Convert to CSV string
    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    
    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `manager_report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!reports && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-reports-container space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Read-only operational reports and performance metrics
          </p>
        </div>
        
        {/* Export Buttons */}
        <div className="no-print flex gap-3">
          <button
            onClick={exportToCSV}
            className="export-button flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <span>📊</span>
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="export-button flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <span>📄</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="no-print rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-600">{success}</p>
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
              Reports are for monitoring purposes only. No data modification allowed.
            </p>
          </div>
        </div>
      </div>

      {reports && (
        <>
          {/* Volume Summary Cards */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(reports.volume_summary || {}).map(([key, value]) => (
              <div
                key={key}
                className="report-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key.replace(/_/g, " ")}
                </p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-900">
                  {value}
                </h3>
              </div>
            ))}
          </section>

          {/* Performance Metrics */}
          {reports.performance_metrics && (
            <section className="report-card rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-indigo-900">
                Performance Metrics (24h)
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                    Total Processed
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-indigo-900">
                    {reports.performance_metrics.total_processed_24h || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                    Approved
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">
                    {reports.performance_metrics.approved_24h || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                    Avg Approval Time
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-indigo-900">
                    {reports.performance_metrics.avg_approval_time_minutes || 0}m
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                    Approval Rate
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-indigo-900">
                    {reports.performance_metrics.approval_rate || 0}%
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Branch Health Report */}
          {reports?.branch_health?.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Branch Risk Assessment
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Pending</th>
                      <th className="px-4 py-3">Stale</th>
                      <th className="px-4 py-3">Avg Risk</th>
                      <th className="px-4 py-3">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reports.branch_health.map((branch) => (
                      <tr key={branch.code} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{branch.label}</td>
                        <td className="px-4 py-3">{branch.pending}</td>
                        <td className="px-4 py-3">{branch.stale}</td>
                        <td className="px-4 py-3">{branch.avg_risk}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`risk-level-${branch.risk_level} font-semibold uppercase`}
                          >
                            {branch.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Two Column Layout: Escalations & Form */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Recent Escalations */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Recent Escalations
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <ul className="space-y-3 text-sm text-slate-700">
                  {(reports?.escalations || []).map((entry) => (
                    <li
                      key={entry.id}
                      className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.subject}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Severity: {entry.severity}
                      </p>
                      <small className="text-xs text-slate-500">
                        {entry.timestamp}
                      </small>
                    </li>
                  ))}
                  {(!reports?.escalations || reports.escalations.length === 0) && (
                    <li className="text-slate-500">No escalations on record.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Escalation Form */}
            <form
              onSubmit={handleSubmit}
              className="no-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                File New Escalation
              </h3>
              <label className="mt-4 block text-sm font-medium text-slate-600">
                Subject
              </label>
              <input
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Brief subject line"
              />
              <label className="mt-4 block text-sm font-medium text-slate-600">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, severity: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <label className="mt-4 block text-sm font-medium text-slate-600">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                rows={5}
                placeholder="Detailed description of the issue"
              />
              <button
                type="submit"
                className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                Escalate to Security Desk
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
};

export default ManagerReports;
