import React, { useMemo } from "react";
import "./RolePulse.css";

const RolePulse = ({ roleBreakdown }) => {
  const entries = useMemo(
    () => Object.entries(roleBreakdown || {}),
    [roleBreakdown],
  );
  const total = useMemo(
    () => entries.reduce((sum, [, count]) => sum + Number(count || 0), 0),
    [entries],
  );

  if (!entries.length) {
    return (
      <p className="text-sm text-slate-400">No certificates issued yet.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([role, count]) => {
        const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
        return (
          <div
            key={role}
            className="rounded-2xl border border-slate-900 bg-slate-950/60 p-5 shadow-lg"
          >
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {role}
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">{count}</p>
            <small className="text-sm text-slate-400">
              {pct}% of inventory
            </small>
            <div className="mt-4 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RolePulse;
