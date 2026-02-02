import React, { useEffect, useState } from "react";
import { fetchManagerDashboard } from "../../../services/managerService";
import "./ManagerDashboard.css";

const ManagerDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchManagerDashboard();
        setOverview(data || {});
        setError(null);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load manager dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <p>Synchronizing approvals queue…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-rose-500">{error}</p>;
  }

  const pendingApprovals = overview?.pending_approvals || [];
  const branchInsights = overview?.branch_health || [];
  const riskFeed = overview?.risk_feed || [];

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Manager Operations Center
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Review pending approvals, monitor certificate posture, and keep an eye
          on branch anomalies.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Pending approvals
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {pendingApprovals.length}
          </h3>
          <p className="text-sm text-slate-500">
            {overview?.oldest_pending || "Queue is fresh"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            High risk flags
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.high_risk_count || 0}
          </h3>
          <p className="text-sm text-slate-500">
            {overview?.highest_risk_branch || "No alerts"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Certificates expiring
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.expiring_certificates || 0}
          </h3>
          <p className="text-sm text-slate-500">
            Next expiry: {overview?.next_expiry || "--"}
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Pending approvals
          </h3>
          <a
            className="text-sm font-semibold text-indigo-600 underline-offset-4 hover:underline"
            href="/transactions/approvals"
          >
            Open queue
          </a>
        </div>
        {pendingApprovals.length === 0 ? (
          <p className="text-sm text-slate-500">All transfers processed.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingApprovals.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">{entry.id}</td>
                    <td className="px-4 py-3">{entry.branch || entry.owner}</td>
                    <td className="px-4 py-3">
                      ₹ {Number(entry.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {entry.risk_level || entry.flag || "normal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Branch health</h3>
        {branchInsights.length === 0 ? (
          <p className="text-sm text-slate-500">
            No branch metrics reported yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Stale</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {branchInsights.map((branch) => (
                  <tr key={branch.code || branch.label}>
                    <td className="px-4 py-3">{branch.label || branch.code}</td>
                    <td className="px-4 py-3">{branch.pending || 0}</td>
                    <td className="px-4 py-3">{branch.stale || 0}</td>
                    <td className="px-4 py-3">
                      {branch.risk || branch.risk_level || "normal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Risk feed</h3>
        {riskFeed.length === 0 ? (
          <p className="text-sm text-slate-500">No active alerts.</p>
        ) : (
          <ul className="space-y-3 text-slate-700">
            {riskFeed.map((alert) => (
              <li
                key={alert.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <strong className="text-slate-900">
                  {alert.title || alert.policy}
                </strong>
                <span className="text-slate-500">
                  {" "}
                  — {alert.detail || alert.summary}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ManagerDashboard;
