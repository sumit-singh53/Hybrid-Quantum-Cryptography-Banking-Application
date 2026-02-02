import React, { useEffect, useState } from "react";
import { fetchBranchAudit } from "../../../services/managerService";
import "./BranchAudit.css";

const BranchAudit = () => {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const loadAudit = async () => {
    try {
      const data = await fetchBranchAudit();
      setEvents(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load branch trail");
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <div className="space-y-5 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Branch audit trail
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Immutable request log projected by branch fingerprinting. Use this
          when reconciling suspicious approvals.
        </p>
      </div>
      <button
        onClick={loadAudit}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Refresh feed
      </button>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <div className="space-y-4 border-l-4 border-indigo-200 pl-5">
        {events.map((entry) => (
          <article
            key={entry.event_id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">
              {entry.branch?.label} • {entry.timestamp}
            </p>
            <p className="text-sm text-slate-600">
              {entry.method} {entry.path} — {entry.action_name}
            </p>
            <p className="text-xs font-mono text-slate-500">
              Certificate: {entry.certificate_id}
            </p>
          </article>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-slate-500">
            No branch activity captured yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default BranchAudit;
