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
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to escalate");
    }
  };

  if (!reports && !error) {
    return <p>Loading reports…</p>;
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-slate-900">
          Manager reports & escalation
        </h2>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        {success && (
          <p className="text-sm font-medium text-emerald-600">{success}</p>
        )}
      </div>

      {reports && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(reports.volume_summary || {}).map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key}
                </p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-900">
                  {value}
                </h3>
              </div>
            ))}
          </section>

          {reports.performance_metrics && (
            <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-indigo-900">Performance Metrics (24h)</h3>
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
        </>
      )}

      {reports?.branch_health?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Branch risk</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Stale</th>
                  <th className="px-4 py-3">Risk level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reports.branch_health.map((branch) => (
                  <tr key={branch.code}>
                    <td className="px-4 py-3">{branch.label}</td>
                    <td className="px-4 py-3">{branch.pending}</td>
                    <td className="px-4 py-3">{branch.stale}</td>
                    <td className="px-4 py-3">{branch.risk_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">
            Recent escalations
          </h3>
          <ul className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            {(reports?.escalations || []).map((entry) => (
              <li
                key={entry.id}
                className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <p className="font-semibold text-slate-900">{entry.subject}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {entry.severity}
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

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-xl font-semibold text-slate-900">
            File new escalation
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
          />
          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Escalate to security desk
          </button>
        </form>
      </section>
    </div>
  );
};

export default ManagerReports;
