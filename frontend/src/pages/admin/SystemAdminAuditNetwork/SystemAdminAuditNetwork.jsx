import React, { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import GlobalAuditFeed from "../GlobalAuditFeed";
import "./SystemAdminAuditNetwork.css";

const normalizeEntries = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.entries)) {
    return payload.entries;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const SystemAdminAuditNetwork = () => {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const feed = await systemAdminService.getGlobalAuditFeed();
      setEntries(normalizeEntries(feed));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load audit feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = [
        entry.action_name,
        entry.path,
        entry.user_id,
        entry.certificate_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [entries, filter]);

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Audit mesh
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Global audit feed
            </h1>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
          <button
            onClick={loadEntries}
            disabled={loading}
            className="h-fit rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing" : "Refresh feed"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <label className="block text-sm text-slate-300">
          Filter by actor or path
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="device-cluster · /api/certificates"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
      </div>

      <GlobalAuditFeed
        sectionId="sys-admin-audit-feed"
        entries={filteredEntries}
        onRefresh={loadEntries}
      />
    </section>
  );
};

export default SystemAdminAuditNetwork;
