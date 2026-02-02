import React, { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import GlobalAuditFeed from "../GlobalAuditFeed";
import "./SystemAdminAuditNetwork.css";

const STORAGE_KEY = "sysAdminAuditReviews";

const readReviews = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to parse stored audit reviews", error);
    return {};
  }
};

const persistReviews = (payload) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist audit reviews", error);
  }
};

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

const getEventId = (entry = {}) => {
  return (
    entry.event_id ||
    entry.eventId ||
    [entry.certificate_id, entry.timestamp].filter(Boolean).join("-") ||
    crypto.randomUUID()
  );
};

const SystemAdminAuditNetwork = () => {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("");
  const [reviews, setReviews] = useState(() => readReviews());
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

  const handleReview = (eventId) => {
    setReviews((prev) => {
      const next = {
        ...prev,
        [eventId]: { reviewedAt: new Date().toISOString() },
      };
      persistReviews(next);
      return next;
    });
  };

  const handleDelete = (eventId) => {
    setReviews((prev) => {
      if (!prev[eventId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[eventId];
      persistReviews(next);
      return next;
    });
  };

  const reviewedCount = Object.keys(reviews).length;
  const latestEntries = filteredEntries.slice(0, 10);

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Audit mesh
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Global audit lattice review + CRUD annotations
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-200/80">
              Stream audit signals from every CA + ledger primitive, filter
              them, and mark entries as reviewed with immutable timestamps.
            </p>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
          <button
            onClick={loadEntries}
            disabled={loading}
            className="h-fit rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold text-slate-100">
            Review ledger (CRUD)
          </h3>
          <p className="text-sm text-slate-400">
            {reviewedCount} reviewed entries
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Reviewed at</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {reviewedCount === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No audit entries reviewed yet.
                  </td>
                </tr>
              ) : (
                Object.entries(reviews).map(([eventId, meta]) => (
                  <tr key={eventId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {eventId}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(meta.reviewedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
                        onClick={() => handleDelete(eventId)}
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

      <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-slate-950 to-emerald-950 p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-100">Quick actions</h3>
        <p className="text-sm text-slate-300">
          Fast-mark the freshest audit entries.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-emerald-900/40 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
              <tr>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/40">
              {latestEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-5 text-center text-slate-400"
                  >
                    No audit entries available.
                  </td>
                </tr>
              ) : (
                latestEntries.map((entry) => {
                  const eventId = getEventId(entry);
                  const isReviewed = Boolean(reviews[eventId]);
                  return (
                    <tr key={eventId}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {eventId}
                      </td>
                      <td className="px-4 py-3">
                        {isReviewed ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-amber-200 transition hover:text-amber-100"
                            onClick={() => handleDelete(eventId)}
                          >
                            Unmark
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
                            onClick={() => handleReview(eventId)}
                          >
                            Mark reviewed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SystemAdminAuditNetwork;
