import React, { useEffect, useState } from "react";
import {
  fetchManagedCustomers,
  revokeCertificate,
} from "../../../services/managerService";
import "./ManagerCertificates.css";

const ManagerCertificates = () => {
  const [roster, setRoster] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("Violation of branch policy");
  const [message, setMessage] = useState(null);

  const loadRoster = async () => {
    try {
      const data = await fetchManagedCustomers();
      setRoster(data || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load certificates");
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const handleRevoke = async () => {
    if (!selected) {
      setMessage("Select a certificate first");
      return;
    }
    try {
      await revokeCertificate(selected.certificate_id, reason);
      setMessage(`Certificate ${selected.certificate_id} revoked`);
      setReason("Violation of branch policy");
      loadRoster();
    } catch (err) {
      setMessage(
        err?.response?.data?.message || "Unable to revoke certificate",
      );
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Certificate controls
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Managers can only revoke certificates; issuance remains centralized at
          the CA.
        </p>
      </div>

      {message && (
        <p className="text-sm font-medium text-rose-600">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Certificates</h3>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {roster.map((entry) => (
                  <tr
                    key={entry.certificate_id}
                    className={
                      selected?.certificate_id === entry.certificate_id
                        ? "cursor-pointer bg-indigo-50/60"
                        : "cursor-pointer"
                    }
                    onClick={() => setSelected(entry)}
                  >
                    <td className="px-4 py-3">{entry.owner}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {entry.certificate_id}
                    </td>
                    <td className="px-4 py-3 capitalize">{entry.status}</td>
                    <td className="px-4 py-3">{entry.branch?.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            Revoke access
          </h3>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <p>
                Target:{" "}
                <strong className="text-slate-900">{selected.owner}</strong>
                <br />
                Certificate:{" "}
                <span className="font-mono text-xs text-slate-500">
                  {selected.certificate_id}
                </span>
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                rows={5}
              />
              <button
                className="w-full rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-400"
                onClick={handleRevoke}
                type="button"
              >
                Revoke certificate
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Select a certificate from the table to stage a revoke.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ManagerCertificates;
