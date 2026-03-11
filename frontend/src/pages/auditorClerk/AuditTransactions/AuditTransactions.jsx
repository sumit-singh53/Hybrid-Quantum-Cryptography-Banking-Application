import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../../services/api";
import "./AuditTransactions.css";

const AuditTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [perPage] = useState(50);
  
  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (amountMin) params.append("amount_min", amountMin);
      if (amountMax) params.append("amount_max", amountMax);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage);
      params.append("per_page", perPage);
      
      const response = await api.get(`/auditor-clerk/transactions/audit?${params.toString()}`);
      setTransactions(response.data.transactions || []);
      setPagination(response.data.pagination || null);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, amountMin, amountMax, searchQuery, currentPage, perPage]);

  const loadStatistics = async () => {
    try {
      const response = await api.get("/auditor-clerk/transactions/statistics");
      setStatistics(response.data);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, statusFilter, loadTransactions]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleViewDetails = async (transactionId) => {
    setLoading(true);
    try {
      const response = await api.get(`/auditor-clerk/transactions/audit/${transactionId}`);
      setSelectedTransaction(response.data);
      setShowDetailModal(true);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadTransactions();
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return transactions;
    
    return [...transactions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === "amount") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [transactions, sortConfig]);

  const exportToCSV = () => {
    const headers = ["Transaction ID", "From Account", "To Account", "Amount", "Purpose", "Status", "Created At", "Approved By"];
    const rows = sortedTransactions.map(tx => [
      tx.id,
      tx.masked_from_account,
      tx.masked_to_account,
      tx.amount,
      tx.purpose || "",
      tx.status,
      tx.created_at || "",
      tx.approved_by || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "APPROVED":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "PENDING":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "REJECTED":
      case "FAILED":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <p className="mt-2 text-base text-slate-600">
          Comprehensive read-only access to all transaction records with advanced filtering and compliance tracking.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-700">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Read-Only Access • No Modification Allowed
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Transactions
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">
              {statistics.total_transactions || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Pending
            </p>
            <h3 className="mt-2 text-3xl font-bold text-amber-800">
              {statistics.pending || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Approved
            </p>
            <h3 className="mt-2 text-3xl font-bold text-emerald-800">
              {statistics.approved || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Rejected
            </p>
            <h3 className="mt-2 text-3xl font-bold text-rose-800">
              {statistics.rejected || 0}
            </h3>
          </div>
        </section>
      )}

      {/* Advanced Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
          Advanced Filters
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Search Transaction ID</label>
            <input
              type="text"
              placeholder="Search by transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Amount Min (₹)</label>
            <input
              type="number"
              placeholder="Min amount"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Amount Max (₹)</label>
            <input
              type="number"
              placeholder="Max amount"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Applying..." : "Apply Filters"}
          </button>
          <button
            onClick={handleClearFilters}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
          >
            Clear Filters
          </button>
          <button
            onClick={exportToCSV}
            disabled={sortedTransactions.length === 0}
            className="ml-auto rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {/* Transaction Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700">
            <tr>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("id")}
              >
                Transaction ID {sortConfig.key === "id" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">From Account</th>
              <th className="px-5 py-4">To Account</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("amount")}
              >
                Amount {sortConfig.key === "amount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Purpose</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("status")}
              >
                Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("created_at")}
              >
                Date {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {sortedTransactions.map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-slate-50">
                <td className="px-5 py-4 font-mono text-xs text-slate-600">
                  {tx.id}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-700">{tx.masked_from_account}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-700">{tx.masked_to_account}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">
                  ₹ {Number(tx.amount).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {tx.purpose || "—"}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleViewDetails(tx.id)}
                    className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {sortedTransactions.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="8">
                  {searchQuery || statusFilter !== "all" || dateFrom || dateTo || amountMin || amountMax
                    ? "No transactions match the current filters."
                    : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600">
            Page {pagination.page} of {pagination.pages} • Total: {pagination.total} transactions
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.has_prev}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.has_next}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" 
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Transaction Details</h3>
                <p className="mt-1 font-mono text-sm text-slate-600">
                  ID: {selectedTransaction.id}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-700">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read-Only View
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Transaction Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Transaction Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">From Account</p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-800">
                      {selectedTransaction.masked_from_account}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">To Account</p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-800">
                      {selectedTransaction.masked_to_account}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Amount</p>
                    <p className="mt-1.5 text-lg font-bold text-slate-800">
                      ₹ {Number(selectedTransaction.amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Status</p>
                    <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              {selectedTransaction.purpose && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold text-slate-500">Purpose</p>
                  <p className="mt-1.5 text-sm text-slate-700">{selectedTransaction.purpose}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Timeline
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Created At</p>
                    <p className="mt-1.5 text-sm text-slate-700">
                      {selectedTransaction.created_at 
                        ? new Date(selectedTransaction.created_at).toLocaleString() 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Created By</p>
                    <p className="mt-1.5 text-sm text-slate-700">
                      {selectedTransaction.created_by || "—"}
                    </p>
                  </div>
                  {selectedTransaction.approved_at && (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Approved At</p>
                        <p className="mt-1.5 text-sm text-slate-700">
                          {new Date(selectedTransaction.approved_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Approved By</p>
                        <p className="mt-1.5 text-sm text-slate-700">
                          {selectedTransaction.approved_by || "—"}
                        </p>
                      </div>
                    </>
                  )}
                  {selectedTransaction.updated_at && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Last Updated</p>
                      <p className="mt-1.5 text-sm text-slate-700">
                        {new Date(selectedTransaction.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Compliance Notice</p>
                    <p className="mt-1 text-xs text-amber-700">
                      This is a read-only audit view. You cannot modify, approve, or reject transactions. 
                      All access to transaction details is logged for compliance purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
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

export default AuditTransactions;
