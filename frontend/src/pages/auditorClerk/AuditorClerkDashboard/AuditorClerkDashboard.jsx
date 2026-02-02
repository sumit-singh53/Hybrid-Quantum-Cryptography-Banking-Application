import React, { useEffect, useState } from "react";
import { fetchAuditorDashboard } from "../../../services/auditorClerkService";
import "./AuditorClerkDashboard.css";

const AuditorClerkDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return <p>Loading auditor station…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-rose-500">{error}</p>;
  }

  const pendingTransfers = overview?.pending_queue || [];
  const policyAlerts = overview?.policy_alerts || [];

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">
          Auditor Clerk Command
        </h2>
        <p className="mt-2 text-base text-slate-400">
          Read-only visibility into hybrid transfer queues, accountability logs,
          and CRL signals. Everything you see is tamper-evident.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-50 shadow-lg">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Pending Investigations
          </p>
          <h3 className="mt-3 text-4xl font-semibold">
            {pendingTransfers.length}
          </h3>
          <p className="text-xs text-slate-400">
            Oldest queued: {overview?.oldest_queue_entry || "not recorded"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-50 shadow-lg">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            CRL drift
          </p>
          <h3 className="mt-3 text-4xl font-semibold">
            {overview?.crl_drift || "0"}
          </h3>
          <p className="text-xs text-slate-400">
            Certificates awaiting revocation push
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-50 shadow-lg">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Last Attestation
          </p>
          <h3 className="mt-3 text-3xl font-semibold">
            {overview?.last_attestation || "--"}
          </h3>
          <p className="text-xs text-slate-400">
            Composed by {overview?.attested_by || "n/a"}
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold text-slate-50">
            Pending Transfers (read-only)
          </h3>
          <a
            className="text-sm font-semibold text-slate-300 underline-offset-4 hover:underline"
            href="/audit/transactions"
          >
            Open ledger
          </a>
        </div>
        {pendingTransfers.length === 0 ? (
          <p className="text-sm text-slate-400">Queue is clear.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
              <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pendingTransfers.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">{entry.id}</td>
                    <td className="px-4 py-3">
                      {entry.branch || entry.channel}
                    </td>
                    <td className="px-4 py-3">
                      ₹ {Number(entry.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {entry.flag || "manual"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold text-slate-50">Policy Alerts</h3>
          <a
            className="text-sm font-semibold text-slate-300 underline-offset-4 hover:underline"
            href="/reports"
          >
            Export evidence
          </a>
        </div>
        {policyAlerts.length === 0 ? (
          <p className="text-sm text-slate-400">No current violations.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-100">
            {policyAlerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <strong className="text-slate-50">
                  {alert.policy || "Policy"}
                </strong>
                <span className="text-slate-400"> · {alert.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AuditorClerkDashboard;
