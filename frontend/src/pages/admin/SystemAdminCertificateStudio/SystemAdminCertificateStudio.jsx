import React, { useMemo, useState } from "react";
import CertificateIssuer from "../CertificateIssuer";
import "./SystemAdminCertificateStudio.css";

const STORAGE_KEY = "sysAdminIssuedCertificates";

const loadRecords = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to parse issuance log", error);
    return [];
  }
};

const persistRecords = (records) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn("Unable to persist issuance log", error);
  }
};

const buildRowId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const SystemAdminCertificateStudio = () => {
  const [records, setRecords] = useState(loadRecords);
  const [filter, setFilter] = useState("");

  const persistAndSet = (updater) => {
    setRecords((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistRecords(next);
      return next;
    });
  };

  const handleIssued = (entry) => {
    const payload = {
      id: buildRowId(),
      ...entry,
      status: "pending escrow",
    };
    persistAndSet((prev) => [payload, ...prev]);
  };

  const handleStatusChange = (id, status) => {
    persistAndSet((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, status, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  };

  const handleDelete = (id) => {
    persistAndSet((prev) => prev.filter((entry) => entry.id !== id));
  };

  const filteredRecords = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return records;
    }
    return records.filter(
      (entry) =>
        entry.userId.toLowerCase().includes(query) ||
        (entry.fullName || "").toLowerCase().includes(query),
    );
  }, [records, filter]);

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          Certificate studio
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Mint + track privileged operator certificates
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200/80">
          Enroll RSA / PQ public keys, seal device secrets, and maintain escrow
          notes for every issuance event.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <CertificateIssuer
          onIssued={handleIssued}
          sectionId="issue-certificate"
        />
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">
              Issuance log (CRUD)
            </h3>
            <p className="text-sm text-slate-400">
              {filteredRecords.length} tracked certificates
            </p>
          </div>
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 md:w-80"
            placeholder="Filter by user or name"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No issuance records captured.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {entry.userId}
                    </td>
                    <td className="px-4 py-3">{entry.fullName}</td>
                    <td className="px-4 py-3">
                      <select
                        value={entry.status}
                        onChange={(event) =>
                          handleStatusChange(entry.id, event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-300 focus:outline-none"
                      >
                        <option value="pending escrow">Pending escrow</option>
                        <option value="delivered">Delivered</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {entry.certificatePath ? (
                        <a
                          href={entry.certificatePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                        >
                          Download PEM
                        </a>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
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

export default SystemAdminCertificateStudio;
