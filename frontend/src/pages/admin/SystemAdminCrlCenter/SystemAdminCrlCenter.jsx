import React, { useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import CRLPanel from "../CRLPanel";
import "./SystemAdminCrlCenter.css";

const STORAGE_KEY = "sysAdminCrlHistory";
const DEFAULT_SNAPSHOT = { revoked: [], metadata: {} };

const loadHistory = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to parse CRL activity", error);
    return [];
  }
};

const persistHistory = (entries) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Unable to persist CRL history", error);
  }
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const SystemAdminCrlCenter = () => {
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [history, setHistory] = useState(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const persistAndSet = (updater) => {
    setHistory((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistHistory(next);
      return next;
    });
  };

  const loadSnapshot = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemAdminService.getCRL();
      setSnapshot(data || DEFAULT_SNAPSHOT);
      return data || DEFAULT_SNAPSHOT;
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load CRL.");
      return snapshot;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = async () => {
    const updated = await loadSnapshot();
    const record = {
      id: makeId(),
      updatedAt: Date.now(),
      revokedCount: updated?.revoked?.length || 0,
    };
    persistAndSet((prev) => [record, ...prev].slice(0, 50));
  };

  const handleDelete = (entryId) => {
    persistAndSet((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const revokedEntries = snapshot?.revoked || [];

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          CRL oversight
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Apply zero-trust revocations and monitor blast radius
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200/80">
          Add compromised certificates to the revocation list and maintain an
          immutable ledger of every revoke operation.
        </p>
        {error && (
          <p className="mt-4 text-sm font-medium text-rose-200">⚠️ {error}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={loadSnapshot}
            disabled={loading}
            className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Syncing" : "Refresh CRL"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <CRLPanel
          initialSnapshot={snapshot}
          onChange={handleChange}
          sectionId="sys-admin-crl"
        />
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold text-slate-100">
            Revocation history (CRUD)
          </h3>
          <p className="text-sm text-slate-400">
            {history.length} recorded snapshots
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Total revoked</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No revocation operations tracked yet.
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">
                      {new Date(entry.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{entry.revokedCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
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
        <h3 className="text-xl font-semibold text-slate-100">
          Currently revoked certificates
        </h3>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-emerald-900/40 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-4 py-3">Certificate ID</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/40">
              {revokedEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-5 text-center text-slate-400"
                  >
                    No revoked certificates detected.
                  </td>
                </tr>
              ) : (
                revokedEntries.map((certId) => (
                  <tr key={certId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {certId}
                    </td>
                    <td className="px-4 py-3">
                      {snapshot?.metadata?.[certId]?.reason || "--"}
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

export default SystemAdminCrlCenter;
