import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTransactionHistory } from "../../../services/transactionService";
import "./TransactionHistory.css";

const defaultFilters = {
  direction: "ALL",
  status: "ALL",
  account: "",
  startDate: "",
  endDate: "",
  search: "",
};

const parseDateInput = (value, endOfDay = false) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if ([year, month, day].some(Number.isNaN)) return null;
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
};

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => ({ ...defaultFilters }));
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getTransactionHistory();
        setTransactions(data || []);
        setError(null);
      } catch {
        setError("Unable to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters(() => ({ ...defaultFilters }));
    setCurrentPage(1);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Direction', 'From Account', 'To Account', 'Amount', 'Status', 'Purpose', 'Created At'];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      tx.direction,
      tx.from_account || '',
      tx.to_account || '',
      tx.amount,
      tx.status,
      tx.purpose || '',
      new Date(tx.created_at).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredTransactions = useMemo(() => {
    const startBoundary = parseDateInput(filters.startDate);
    const endBoundary = parseDateInput(filters.endDate, true);
    const accountQuery = filters.account.trim().toLowerCase();
    const searchQuery = filters.search.trim().toLowerCase();

    let filtered = transactions.filter((tx) => {
      const createdAt = tx.created_at ? new Date(tx.created_at) : null;

      // Direction filter
      if (filters.direction !== "ALL" && tx.direction !== filters.direction) {
        return false;
      }

      // Status filter
      if (filters.status !== "ALL" && tx.status?.toUpperCase() !== filters.status) {
        return false;
      }

      // Account filter
      if (accountQuery) {
        const fromAccount = `${tx.from_account || ""}`.toLowerCase();
        const toAccount = `${tx.to_account || ""}`.toLowerCase();
        const matchesAccount =
          fromAccount.includes(accountQuery) ||
          toAccount.includes(accountQuery);
        if (!matchesAccount) return false;
      }

      // Global search filter
      if (searchQuery) {
        const searchableText = `
          ${tx.id}
          ${tx.from_account || ''}
          ${tx.to_account || ''}
          ${tx.amount}
          ${tx.purpose || ''}
          ${tx.status || ''}
        `.toLowerCase();
        if (!searchableText.includes(searchQuery)) return false;
      }

      // Date filters
      if (startBoundary && (!createdAt || createdAt < startBoundary)) {
        return false;
      }

      if (endBoundary && (!createdAt || createdAt > endBoundary)) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle dates
        if (sortConfig.key === 'created_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle numbers
        if (sortConfig.key === 'amount') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [transactions, filters, sortConfig]);

  const filtersPristine =
    filters.direction === "ALL" &&
    filters.status === "ALL" &&
    !filters.account &&
    !filters.startDate &&
    !filters.endDate &&
    !filters.search;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  };

  const renderDirectionBadge = (direction) => {
    const isSent = direction === "SENT";
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isSent ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {isSent && (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          </svg>
        )}
        {!isSent && (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
        )}
        {isSent ? "Sent" : "Received"}
      </span>
    );
  };

  const renderStatus = (status) => {
    const statusMap = {
      pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
      pending_review: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Review" },
      approved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved" },
      rejected: { bg: "bg-rose-50", text: "text-rose-700", label: "Rejected" },
    };
    const config = statusMap[status?.toLowerCase()] || { bg: "bg-slate-100", text: "text-slate-600", label: status || "Unknown" };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">
            Transaction History
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredTransactions.length === 0}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </header>

      {error && (
        <p className="text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      {/* Global Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by ID, amount, account, or purpose..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
        />
        <svg className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div
        className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-6"
        aria-label="Filter transactions"
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="direction-filter"
          >
            Direction
          </label>
          <select
            id="direction-filter"
            value={filters.direction}
            onChange={(event) => updateFilter("direction", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">All</option>
            <option value="SENT">Sent</option>
            <option value="RECEIVED">Received</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="status-filter"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="account-filter"
          >
            Account
          </label>
          <input
            type="text"
            id="account-filter"
            placeholder="Search account"
            value={filters.account}
            onChange={(event) => updateFilter("account", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="start-date-filter"
          >
            From Date
          </label>
          <input
            type="date"
            id="start-date-filter"
            value={filters.startDate}
            onChange={(event) => updateFilter("startDate", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="end-date-filter"
          >
            To Date
          </label>
          <input
            type="date"
            id="end-date-filter"
            value={filters.endDate}
            onChange={(event) => updateFilter("endDate", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={clearFilters}
            disabled={filtersPristine}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading your ledger…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-slate-500">No transactions recorded yet.</p>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-sm text-slate-500">
            No transactions match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table
              className="min-w-full divide-y divide-slate-200 text-left text-sm"
              aria-label="Transaction history"
            >
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('direction')}
                  >
                    <div className="flex items-center gap-1">
                      Direction
                      {getSortIcon('direction')}
                    </div>
                  </th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center gap-1">
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-4 py-3">Purpose</th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTransactions.map((tx) => {
                  const counterparty =
                    tx.direction === "SENT" ? tx.to_account : tx.from_account;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {renderDirectionBadge(tx.direction)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {counterparty}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">{renderStatus(tx.status)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {tx.purpose || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedTransaction(tx)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          View
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-600">per page</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)}>
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-slate-900 mb-6">Transaction Details</h3>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Transaction ID</p>
                  <p className="text-sm font-mono text-slate-900">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Direction</p>
                  {renderDirectionBadge(selectedTransaction.direction)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">From Account</p>
                  <p className="text-sm font-mono text-slate-900">{selectedTransaction.from_account || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">To Account</p>
                  <p className="text-sm font-mono text-slate-900">{selectedTransaction.to_account || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ₹{Number(selectedTransaction.amount).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Status</p>
                  {renderStatus(selectedTransaction.status)}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Purpose</p>
                <p className="text-sm text-slate-700">{selectedTransaction.purpose || 'No purpose specified'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Created At</p>
                <p className="text-sm text-slate-700">{formatDate(selectedTransaction.created_at)}</p>
              </div>

              {selectedTransaction.approved_at && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Approved At</p>
                  <p className="text-sm text-slate-700">{formatDate(selectedTransaction.approved_at)}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="rounded-2xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
              <Link
                to={`/transactions/${selectedTransaction.id}`}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl"
              >
                Full Details
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TransactionHistory;
