import React, { useEffect, useMemo, useState } from "react";
import {
  fetchManagedCustomers,
  resetCustomerDeviceBinding,
} from "../../../services/managerService";
import "./ManagerCustomers.css";

const ManagerCustomers = () => {
  const [roster, setRoster] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchManagedCustomers();
      setRoster(data || []);
      setMessage(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return roster;
    const q = query.toLowerCase();
    return roster.filter(
      (entry) =>
        entry.owner?.toLowerCase().includes(q) ||
        entry.certificate_id?.toLowerCase().includes(q),
    );
  }, [query, roster]);

  const handleReset = async (userId) => {
    try {
      await resetCustomerDeviceBinding(userId);
      setMessage(`Device binding reset for ${userId}`);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to reset binding");
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Customers under your branch
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Inspect device binding state and last activity per certificate before
          approving additional limits.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          placeholder="Search by name or certificate"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:max-w-md"
        />
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={loadCustomers}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {message && (
        <p className="text-sm font-medium text-rose-600">{message}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Binding</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.map((entry) => (
              <tr key={entry.certificate_id}>
                <td className="px-4 py-3">{entry.owner}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {entry.certificate_id}
                </td>
                <td className="px-4 py-3">{entry.branch?.label}</td>
                <td className="px-4 py-3 capitalize">{entry.status}</td>
                <td className="px-4 py-3 capitalize">{entry.binding_state}</td>
                <td className="px-4 py-3 text-slate-500">
                  {entry.last_seen || "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleReset(entry.certificate_id)}
                    className="rounded-2xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    Reset binding
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan="7"
                >
                  No customers match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerCustomers;
