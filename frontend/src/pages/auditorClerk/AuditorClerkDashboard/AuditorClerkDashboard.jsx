import React, { useEffect, useState } from "react";
import { fetchAuditorDashboard } from "../../../services/auditorClerkService";
import "./AuditorClerkDashboard.css";

const AuditorClerkDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("pq_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserInfo();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAuditorDashboard();
        setOverview(data || {});
        setError(null);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load auditor dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-lg text-slate-600">Loading auditor station…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  const pendingTransfers = overview?.pending_queue || [];
  const policyAlerts = overview?.policy_alerts || [];

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-8 shadow-lg">
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Read-only visibility into hybrid transfer queues, accountability logs,
          and CRL signals. Everything you see is tamper-evident.
        </p>
        {user && user.role && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-emerald-900">
              Role: <span className="font-semibold capitalize">{user.role.name || user.role}</span>
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition-all hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Investigations
          </p>
          <h3 className="mt-4 text-5xl font-bold text-slate-900">
            {pendingTransfers.length}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Oldest queued: {overview?.oldest_queue_entry || "not recorded"}
          </p>
        </article>
        
        <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition-all hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            CRL Drift
          </p>
          <h3 className="mt-4 text-5xl font-bold text-slate-900">
            {overview?.crl_drift || "0"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Certificates awaiting revocation push
          </p>
        </article>
        
        <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition-all hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Last Attestation
          </p>
          <h3 className="mt-4 text-4xl font-bold text-slate-900">
            {overview?.last_attestation || "--"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Composed by {overview?.attested_by || "n/a"}
          </p>
        </article>
      </section>

      {/* Pending Transfers Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-2xl font-bold text-slate-900">
            Pending Transfers <span className="text-slate-500">(read-only)</span>
          </h3>
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow"
            href="/audit/transactions"
          >
            Open ledger →
          </a>
        </div>
        {pendingTransfers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-600">Queue is clear.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      ID
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Origin
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pendingTransfers.slice(0, 5).map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{entry.id}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {entry.branch || entry.channel}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ₹ {Number(entry.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                          {entry.flag || "manual"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Policy Alerts Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-2xl font-bold text-slate-900">Policy Alerts</h3>
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow"
            href="/reports"
          >
            Export evidence →
          </a>
        </div>
        {policyAlerts.length === 0 ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <p className="text-sm font-medium text-green-700">No current violations.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {policyAlerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm"
              >
                <strong className="text-base font-bold text-slate-900">
                  {alert.policy || "Policy"}
                </strong>
                <span className="ml-2 text-slate-700">· {alert.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AuditorClerkDashboard;
