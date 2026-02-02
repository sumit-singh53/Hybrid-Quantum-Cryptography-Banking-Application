import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTransactionHistory } from "../../../services/transactionService";
import "./TransactionHistory.css";

const defaultFilters = {
  direction: "ALL",
  account: "",
  startDate: "",
  endDate: "",
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
  };

  const clearFilters = () => setFilters(() => ({ ...defaultFilters }));

  const filteredTransactions = useMemo(() => {
    const startBoundary = parseDateInput(filters.startDate);
    const endBoundary = parseDateInput(filters.endDate, true);
    const accountQuery = filters.account.trim().toLowerCase();

    return transactions.filter((tx) => {
      const createdAt = tx.created_at ? new Date(tx.created_at) : null;

      if (filters.direction !== "ALL" && tx.direction !== filters.direction) {
        return false;
      }

      if (accountQuery) {
        const fromAccount = `${tx.from_account || ""}`.toLowerCase();
        const toAccount = `${tx.to_account || ""}`.toLowerCase();
        const matchesAccount =
          fromAccount.includes(accountQuery) ||
          toAccount.includes(accountQuery);
        if (!matchesAccount) return false;
      }

      if (startBoundary && (!createdAt || createdAt < startBoundary)) {
        return false;
      }

      if (endBoundary && (!createdAt || createdAt > endBoundary)) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const filtersPristine =
    filters.direction === "ALL" &&
    !filters.account &&
    !filters.startDate &&
    !filters.endDate;

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  };

  const renderDirectionBadge = (direction) => {
    const isSent = direction === "SENT";
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          isSent ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {isSent ? "Sent" : "Received"}
      </span>
    );
  };

  const renderStatus = (status) => {
    const palette = {
      pending: "bg-amber-50 text-amber-700",
      approved: "bg-emerald-50 text-emerald-700",
      rejected: "bg-rose-50 text-rose-700",
    };
    const tone =
      palette[status?.toLowerCase()] || "bg-slate-100 text-slate-600";
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold text-slate-900">
          Transaction History
        </h3>
        <p className="text-sm text-slate-600">
          Every movement shows whether you sent or received the funds. Select
          any row to review the full ledger entry.
        </p>
      </header>

      {error && (
        <p className="text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      <div
        className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-5"
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
            htmlFor="account-filter"
          >
            Account Number
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
        <p className="text-sm text-slate-500">
          No transactions match your filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table
            className="min-w-full divide-y divide-slate-200 text-left text-sm"
            aria-label="Transaction history"
          >
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.map((tx) => {
                const counterparty =
                  tx.direction === "SENT" ? tx.to_account : tx.from_account;
                return (
                  <tr key={tx.id}>
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
                    <td className="px-4 py-3 text-slate-600">
                      {tx.purpose || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        to={`/transactions/${tx.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TransactionHistory;
