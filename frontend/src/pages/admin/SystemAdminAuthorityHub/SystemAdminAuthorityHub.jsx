import React, { useState } from "react";
import AuthorityControls from "../AuthorityControls";
import "./SystemAdminAuthorityHub.css";

const STORAGE_KEY = "sysAdminAuthorityRotations";

const readRotations = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to parse rotation log", error);
    return [];
  }
};

const persistRotations = (entries) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Unable to persist rotation log", error);
  }
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const SystemAdminAuthorityHub = () => {
  const [rotations, setRotations] = useState(() => readRotations());

  const persistAndSet = (updater) => {
    setRotations((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistRotations(next);
      return next;
    });
  };

  const handleRotation = (details = {}) => {
    const entry = {
      id: makeId(),
      timestamp: Date.now(),
      rsaPath:
        details?.classical?.public_key_path ||
        details?.rsaPath ||
        "rsa/ca-root.pem",
      pqPath:
        details?.post_quantum?.public_key_path ||
        details?.pqPath ||
        "pq/ca-root.pem",
    };

    persistAndSet((prev) => [entry, ...prev].slice(0, 50));
  };

  const handleDelete = (entryId) => {
    persistAndSet((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          Authority hub
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Rotate CA material and capture compliance proofs
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200/80">
          Trigger dual-stack CA rotations and store verifiable artifacts for
          later compliance or incident response needs.
        </p>
      </div>

      <AuthorityControls onRotation={handleRotation} sectionId="sys-admin-ca" />

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold text-slate-100">
            Rotation log (CRUD)
          </h3>
          <p className="text-sm text-slate-400">
            {rotations.length} recorded rotations
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">RSA bundle</th>
                <th className="px-4 py-3">PQ bundle</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {rotations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No authority rotations performed.
                  </td>
                </tr>
              ) : (
                rotations.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {entry.rsaPath}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {entry.pqPath}
                    </td>
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
    </section>
  );
};

export default SystemAdminAuthorityHub;
