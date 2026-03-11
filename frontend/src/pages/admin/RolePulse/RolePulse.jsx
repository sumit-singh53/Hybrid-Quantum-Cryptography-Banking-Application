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
      <p className="text-sm text-slate-600 dark:text-slate-400">No certificates issued yet.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([role, count]) => {
        const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
        return (
          <div
            key={role}
            className="rounded-2xl border p-5 shadow-lg transition-all duration-300 border-slate-300 bg-gradient-to-br from-white to-slate-50 hover:shadow-xl dark:border-slate-900 dark:bg-slate-950/60 dark:hover:border-slate-800"
          >
            <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {role}
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-white">{count}</p>
            <small className="text-sm text-slate-600 dark:text-slate-400">
              {pct}% of inventory
            </small>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 dark:from-indigo-400 dark:via-sky-400 dark:to-cyan-300"
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
