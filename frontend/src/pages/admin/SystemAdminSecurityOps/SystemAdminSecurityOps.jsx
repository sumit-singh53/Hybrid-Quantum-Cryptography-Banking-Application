import React, { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import SecurityEventFeed from "../SecurityEventFeed";
import SessionKillSwitch from "../SessionKillSwitch";
import "./SystemAdminSecurityOps.css";

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

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Security ops
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Security telemetry & emergency controls
            </h1>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="h-fit rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityEventFeed
          sectionId="sys-admin-security"
          events={events}
          onRefresh={loadEvents}
        />
        <SessionKillSwitch sectionId="sys-admin-kill" />
      </div>
    </section>
  );
};

export default SystemAdminSecurityOps;
