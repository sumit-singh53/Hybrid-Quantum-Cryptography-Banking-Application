import React, { useEffect, useState } from "react";
import { fetchCombinedLogs } from "../../../services/auditorClerkService";
import "./AuditLogs.css";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [requestTrail, setRequestTrail] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await fetchCombinedLogs();
        setLogs(data.audit_logs || []);
        setRequestTrail(data.request_trail || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load audit logs");
      }
    };

    loadLogs();
  }, []);

  if (error) {
    return <p className="text-sm font-medium text-rose-400">{error}</p>;
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">Audit Logs</h2>
        <p className="mt-2 text-base text-slate-400">
          Immutable evidence for every sensitive action.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">
          Regulatory Audit Table
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">{log.timestamp}</td>
                  <td className="px-4 py-3">{log.user_name}</td>
                  <td className="px-4 py-3">{log.user_role}</td>
                  <td className="px-4 py-3">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">
          Certificate Request Trail
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requestTrail.map((entry) => (
                <tr key={`${entry.entry_hash}`}>
                  <td className="px-4 py-3">{entry.timestamp}</td>
                  <td className="px-4 py-3">{entry.certificate_id}</td>
                  <td className="px-4 py-3">{entry.action_name}</td>
                  <td className="px-4 py-3">{entry.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AuditLogs;
