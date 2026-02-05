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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [detailModal, setDetailModal] = useState(null);

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
    let filtered = queue;
    
    // Apply filter
    if (filter === "high") {
      filtered = filtered.filter((item) => item?.risk?.is_high_value);
    } else if (filter === "stale") {
      filtered = filtered.filter((item) => item?.risk?.stale);
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        item.id?.toString().toLowerCase().includes(query) ||
        item.from_name?.toLowerCase().includes(query) ||
        item.to_account?.toLowerCase().includes(query) ||
        item.amount?.toString().includes(query) ||
        item.branch?.label?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle nested properties
        if (sortConfig.key === "branch") {
          aVal = a.branch?.label || "";
          bVal = b.branch?.label || "";
        } else if (sortConfig.key === "risk") {
          aVal = a.risk?.level || "normal";
          bVal = b.risk?.level || "normal";
        } else if (sortConfig.key === "amount") {
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
        }
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [queue, filter, searchQuery, sortConfig]);

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
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      loadPending();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) {
      setError("Please select at least one transaction");
      return;
    }
    
    if (action === "reject" && !bulkReason) {
      setError("Rejection reason is required for bulk reject");
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const id of selectedIds) {
      try {
        await decideOnTransaction(id, {
          action,
          reason: bulkReason || reasonMap[id],
        });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    setSelectedIds(new Set());
    setBulkReason("");
    setError(null);
    
    if (failCount === 0) {
      setError(null);
    } else {
      setError(`${successCount} succeeded, ${failCount} failed`);
    }
    
    loadPending();
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredQueue.map(tx => tx.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, checked) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportToCSV = () => {
    const headers = ["ID", "From", "To Account", "Amount", "Branch", "Risk Level"];
    const rows = filteredQueue.map(tx => [
      tx.id,
      tx.from_name,
      tx.to_account,
      tx.amount,
      tx.branch?.label || "",
      tx.risk?.level || "normal"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending-approvals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
            <input
              type="text"
              placeholder="Search by ID, customer, account, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={loadPending}
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredQueue.length === 0}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export CSV
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <span className="text-sm font-semibold text-indigo-900">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkAction("approve")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Reject Selected
            </button>
            <input
              type="text"
              placeholder="Reason for bulk reject..."
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      {filteredQueue.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {searchQuery ? "No transactions match your search." : "Queue is empty."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredQueue.length && filteredQueue.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                  onClick={() => handleSort("id")}
                >
                  ID {sortConfig.key === "id" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                  onClick={() => handleSort("amount")}
                >
                  Amount {sortConfig.key === "amount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                  onClick={() => handleSort("branch")}
                >
                  Branch {sortConfig.key === "branch" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                  onClick={() => handleSort("risk")}
                >
                  Risk {sortConfig.key === "risk" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQueue.map((tx) => (
                <tr key={tx.id} className={selectedIds.has(tx.id) ? "bg-indigo-50" : ""}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={(e) => handleSelectOne(tx.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailModal(tx)}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {tx.from_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {tx.to_account}
                  </td>
                  <td className="px-4 py-3 font-semibold">
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

      {/* Transaction Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white p-6">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Transaction Details</h3>
                <p className="mt-1 font-mono text-sm text-slate-500">{detailModal.id}</p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Risk Assessment */}
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900">Risk Assessment</p>
                    <p className="text-sm text-amber-700">
                      {detailModal.risk?.level === "critical" ? "Critical - Requires immediate attention" :
                       detailModal.risk?.level === "elevated" ? "Elevated - Additional review recommended" :
                       "Normal - Standard processing"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/50 p-3">
                    <p className="text-xs text-amber-600">High Value</p>
                    <p className="font-semibold text-amber-900">
                      {detailModal.risk?.is_high_value ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/50 p-3">
                    <p className="text-xs text-amber-600">Stale Transaction</p>
                    <p className="font-semibold text-amber-900">
                      {detailModal.risk?.stale ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Information */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{detailModal.from_name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{detailModal.owner}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">To Account</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{detailModal.to_account}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Amount</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                    ₹ {Number(detailModal.amount).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{detailModal.branch?.label || "N/A"}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Timeline</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Initiated</span>
                    <span className="font-semibold text-slate-900">
                      {detailModal.initiated_at ? new Date(detailModal.initiated_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Submitted</span>
                    <span className="font-semibold text-slate-900">
                      {detailModal.submitted_at ? new Date(detailModal.submitted_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Status</span>
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {detailModal.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-slate-200 pt-4">
                <button
                  onClick={() => {
                    handleDecision(detailModal.id, "approve");
                    setDetailModal(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  ✓ Approve Transaction
                </button>
                <button
                  onClick={() => {
                    handleDecision(detailModal.id, "reject");
                    setDetailModal(null);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  ✗ Reject Transaction
                </button>
                <button
                  onClick={() => setDetailModal(null)}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveTransaction;
