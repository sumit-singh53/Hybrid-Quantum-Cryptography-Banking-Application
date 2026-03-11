import React, { useEffect, useState } from "react";
import { fetchCertificateInventory } from "../../../services/auditorClerkService";
import "./AuditCertificates.css";

const AuditCertificates = () => {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const data = await fetchCertificateInventory();
        setInventory(data.inventory || []);
        setAlerts(data.alerts || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load certificates");
      }
    };

    loadCertificates();
  }, []);

  if (error) {
    return <p className="text-sm font-medium text-rose-400">{error}</p>;
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">
          Certificate Lineage &amp; CRL Status
        </h2>
        <p className="mt-2 text-base text-slate-400">
          Every issued certificate, its lineage fingerprint, and revocation
          posture.
        </p>
      </div>

      <section>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Lineage</th>
                <th className="px-4 py-3">Valid To</th>
                <th className="px-4 py-3">Revoked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inventory.map((item) => (
                <tr key={item.certificate_id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {item.certificate_id}
                  </td>
                  <td className="px-4 py-3">{item.owner}</td>
                  <td className="px-4 py-3 uppercase tracking-wide text-slate-300">
                    {item.role}
                  </td>
                  <td className="px-4 py-3">{item.lineage_id}</td>
                  <td className="px-4 py-3">{item.valid_to}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span
                      className={
                        item.revoked ? "text-rose-400" : "text-emerald-400"
                      }
                    >
                      {item.revoked ? "Revoked" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">
            No certificate anomalies detected.
          </p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {alerts.map((alert) => (
              <li
                key={`${alert.certificate_id}-${alert.reason}`}
                className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3"
              >
                <span className="font-semibold text-amber-200">
                  {alert.certificate_id}
                </span>
                : {alert.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AuditCertificates;
