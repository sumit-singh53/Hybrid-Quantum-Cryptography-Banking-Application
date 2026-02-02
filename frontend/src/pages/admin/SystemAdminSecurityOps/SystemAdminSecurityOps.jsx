import React, { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import SecurityEventFeed from "../SecurityEventFeed";
import SessionKillSwitch from "../SessionKillSwitch";
import "./SystemAdminSecurityOps.css";

const STORAGE_KEY = "sysAdminKillLog";

const loadKillLog = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to parse kill switch log", error);
    return [];
  }
};

const persistKillLog = (entries) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Unable to persist kill switch log", error);
  }
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeEvents = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.events)) {
    return payload.events;
  }
  return [];
};

const SystemAdminSecurityOps = () => {
  const [events, setEvents] = useState([]);
  const [killLog, setKillLog] = useState(() => loadKillLog());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemAdminService.getSecurityEvents();
      setEvents(normalizeEvents(data));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to fetch telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const persistAndSet = (updater) => {
    setKillLog((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistKillLog(next);
      return next;
    });
  };

  const handleKill = (details = {}) => {
    const entry = {
      id: makeId(),
      timestamp: Date.now(),
      userId: details.userId || details.user_id || "--",
      role: details.role || "--",
      terminatedSessions:
        details.terminatedSessions ??
        details.sessions_terminated ??
        details.count ??
        0,
    };
    persistAndSet((prev) => [entry, ...prev].slice(0, 50));
  };

  const handleDelete = (entryId) => {
    persistAndSet((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Security ops
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Telemetry, kill switches, and deviance escalation
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-200/80">
              Streaming hardware fingerprints and server events feed directly
              into an emergency kill switch that can invalidate risky sessions
              at once.
            </p>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="h-fit rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing" : "Refresh telemetry"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityEventFeed
          sectionId="sys-admin-security"
          events={events}
          onRefresh={loadEvents}
        />
        <SessionKillSwitch sectionId="sys-admin-kill" onKill={handleKill} />
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold text-slate-100">
            Kill-switch log (CRUD)
          </h3>
          <p className="text-sm text-slate-400">
            {killLog.length} actions captured
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Target user</th>
                <th className="px-4 py-3">Role scope</th>
                <th className="px-4 py-3">Sessions terminated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {killLog.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No kill-switch actions recorded.
                  </td>
                </tr>
              ) : (
                killLog.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {entry.userId || "--"}
                    </td>
                    <td className="px-4 py-3 uppercase tracking-wide text-slate-300">
                      {entry.role || "--"}
                    </td>
                    <td className="px-4 py-3 text-lg font-semibold text-white">
                      {entry.terminatedSessions}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SystemAdminSecurityOps;
