import React, { useEffect, useMemo, useState } from "react";
import {
  fetchPendingTransactions,
  decideOnTransaction,
} from "../../../services/managerService";
import "./ApproveTransaction.css";

const ApproveTransaction = () => {
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);
  const [reasonMap, setReasonMap] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingTransactions();
      setQueue(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const filteredQueue = useMemo(() => {
    if (filter === "high") {
      return queue.filter((item) => item?.risk?.is_high_value);
    }
    if (filter === "stale") {
      return queue.filter((item) => item?.risk?.stale);
    }
    return queue;
  }, [queue, filter]);

  const handleDecision = async (id, action) => {
    const normalized = action.toLowerCase();
    if (normalized === "reject" && !reasonMap[id]) {
      setError("Rejection reason is required");
      return;
    }
    try {
      await decideOnTransaction(id, {
        action: normalized,
        reason: reasonMap[id],
      });
      setReasonMap((prev) => ({ ...prev, [id]: "" }));
      loadPending();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed");
    }
  };

  const renderRiskChip = (risk) => {
    if (!risk) {
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          normal
        </span>
      );
    }
    const palette = {
      critical: "bg-rose-100 text-rose-700",
      elevated: "bg-amber-100 text-amber-700",
      normal: "bg-emerald-100 text-emerald-700",
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          palette[risk.level] || "bg-slate-100 text-slate-600"
        }`}
      >
        {risk.level}
      </span>
    );
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Pending approvals
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Approve high-value transfers or reject with a policy-bound reason.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <label className="text-sm font-medium text-slate-600">
          Filter queue:
        </label>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
          >
            <option value="all">All pending</option>
            <option value="high">High value</option>
            <option value="stale">Stale (&gt;12h)</option>
          </select>
          <button
            onClick={loadPending}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      {filteredQueue.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Queue is empty.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQueue.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3">{tx.id}</td>
                  <td className="px-4 py-3">{tx.from_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {tx.to_account}
                  </td>
                  <td className="px-4 py-3">
                    ₹ {Number(tx.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">{tx.branch?.label}</td>
                  <td className="px-4 py-3">{renderRiskChip(tx.risk)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleDecision(tx.id, "approve")}
                        className="rounded-2xl bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecision(tx.id, "reject")}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Reject
                      </button>
                    </div>
                    <textarea
                      placeholder="Reason (required for reject)"
                      value={reasonMap[tx.id] || ""}
                      onChange={(e) =>
                        setReasonMap((prev) => ({
                          ...prev,
                          [tx.id]: e.target.value,
                        }))
                      }
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      rows={3}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApproveTransaction;
