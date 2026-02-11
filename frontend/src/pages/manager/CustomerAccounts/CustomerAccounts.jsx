import React, { useEffect, useMemo, useState } from "react";
import {
  fetchCustomerAccounts,
  getCustomerAccountDetails,
  updateAccountStatus,
  forwardAccountForReview,
  getAccountStatistics,
} from "../../../services/managerService";
import "./CustomerAccounts.css";

const CustomerAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState({ status: "", reason: "" });
  const [forwardData, setForwardData] = useState({ reason: "", priority: "normal" });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [accountsData, statsData] = await Promise.all([
        fetchCustomerAccounts(statusFilter !== "all" ? statusFilter : null, accountTypeFilter !== "all" ? accountTypeFilter : null),
        getAccountStatistics(),
      ]);
      setAccounts(accountsData || []);
      setStatistics(statsData || {});
      setMessage(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load customer accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [statusFilter, accountTypeFilter]);

  const filtered = useMemo(() => {
    let result = accounts;
    
    // Apply search
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.name?.toLowerCase().includes(q) ||
          entry.customer_id?.toLowerCase().includes(q) ||
          entry.masked_account_number?.toLowerCase().includes(q) ||
          entry.account_number?.toLowerCase().includes(q)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [query, accounts, sortConfig]);

  const handleViewDetails = async (customerId) => {
    setLoading(true);
    try {
      const details = await getCustomerAccountDetails(customerId);
      setSelectedCustomer(details);
      setMessage(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load customer details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeData.status) {
      setMessage("Please select a status");
      return;
    }

    setLoading(true);
    try {
      await updateAccountStatus(
        selectedCustomer.customer_id,
        statusChangeData.status,
        statusChangeData.reason
      );
      setMessage(`Account status updated to ${statusChangeData.status}`);
      setShowStatusModal(false);
      setStatusChangeData({ status: "", reason: "" });
      setSelectedCustomer(null);
      loadAccounts();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to update account status");
    } finally {
      setLoading(false);
    }
  };

  const handleForwardForReview = async () => {
    if (!forwardData.reason) {
      setMessage("Please provide a reason");
      return;
    }

    setLoading(true);
    try {
      await forwardAccountForReview(
        selectedCustomer.customer_id,
        forwardData.reason,
        forwardData.priority
      );
      setMessage("Account forwarded for review");
      setShowForwardModal(false);
      setForwardData({ reason: "", priority: "normal" });
      setSelectedCustomer(null);
      loadAccounts();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to forward account");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportToCSV = () => {
    const headers = ["Customer ID", "Name", "Account Number", "Account Type", "Status", "Balance", "KYC Status", "Created At"];
    const rows = filtered.map(entry => [
      entry.customer_id,
      entry.name,
      entry.masked_account_number,
      entry.account_type,
      entry.account_status,
      entry.balance,
      entry.kyc_status,
      entry.created_at || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-accounts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700";
      case "LIMITED":
        return "bg-amber-100 text-amber-700";
      case "FROZEN":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getKYCStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "bg-emerald-100 text-emerald-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "rejected":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-8 shadow-lg">

      </div>

      {/* Statistics Cards */}
      {statistics && (
        <section className="grid gap-6 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Accounts
            </p>
            <h3 className="mt-4 text-4xl font-bold text-slate-900">
              {statistics.total_accounts || 0}
            </h3>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Active Accounts
            </p>
            <h3 className="mt-4 text-4xl font-bold text-emerald-600">
              {statistics.active || 0}
            </h3>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Limited Accounts
            </p>
            <h3 className="mt-4 text-4xl font-bold text-amber-600">
              {statistics.limited || 0}
            </h3>
          </article>

          <article className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Frozen Accounts
            </p>
            <h3 className="mt-4 text-4xl font-bold text-rose-600">
              {statistics.frozen || 0}
            </h3>
          </article>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            placeholder="Search by name, customer ID, or account number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="limited">Limited</option>
            <option value="frozen">Frozen</option>
          </select>
          <select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Account Types</option>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="fixed_deposit">Fixed Deposit</option>
          </select>
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={loadAccounts}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl border p-4 ${
          message.includes("success") || message.includes("updated") || message.includes("forwarded")
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50"
        }`}>
          <p className={`text-sm font-medium ${
            message.includes("success") || message.includes("updated") || message.includes("forwarded")
              ? "text-emerald-600"
              : "text-rose-600"
          }`}>{message}</p>
        </div>
      )}

      {/* Customer Accounts Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("customer_id")}
              >
                Customer ID {sortConfig.key === "customer_id" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("name")}
              >
                Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Account Number</th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("account_type")}
              >
                Account Type {sortConfig.key === "account_type" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("account_status")}
              >
                Status {sortConfig.key === "account_status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Balance (Read-only)</th>
              <th className="px-4 py-3">KYC Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.map((account) => (
              <tr key={account.customer_id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {account.customer_id}
                </td>
                <td className="px-4 py-3 font-semibold">{account.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {account.masked_account_number}
                </td>
                <td className="px-4 py-3 capitalize">{account.account_type?.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(account.account_status)}`}>
                    {account.account_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  ₹ {Number(account.balance).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${getKYCStatusColor(account.kyc_status)}`}>
                    {account.kyc_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleViewDetails(account.customer_id)}
                    className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan="8"
                >
                  {query || statusFilter !== "all" || accountTypeFilter !== "all" 
                    ? "No customer accounts match the current filters." 
                    : "No customer accounts found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{selectedCustomer.name}</h3>
                <p className="mt-1 font-mono text-sm text-slate-500">Customer ID: {selectedCustomer.customer_id}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account Number</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-slate-900">{selectedCustomer.masked_account_number}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account Type</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{selectedCustomer.account_type?.toLowerCase()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account Status</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedCustomer.account_status)}`}>
                    {selectedCustomer.account_status}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance (Read-only)</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">₹ {Number(selectedCustomer.balance).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch Code</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{selectedCustomer.branch_code || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">KYC Status</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${getKYCStatusColor(selectedCustomer.kyc_status)}`}>
                    {selectedCustomer.kyc_status}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account Created</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Updated</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedCustomer.updated_at ? new Date(selectedCustomer.updated_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              {selectedCustomer.email && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedCustomer.email}</p>
                </div>
              )}

              {selectedCustomer.mobile && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mobile</p>
                  <p className="mt-1 text-sm text-slate-900">{selectedCustomer.mobile}</p>
                </div>
              )}

              <div className="flex gap-3">
                {selectedCustomer.account_status !== "FROZEN" && (
                  <button
                    onClick={() => {
                      setShowStatusModal(true);
                    }}
                    className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Change Status
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowForwardModal(true);
                  }}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Forward for Review
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-900">Change Account Status</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-slate-700">
                  <strong>Customer:</strong> {selectedCustomer.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Current Status: <span className="font-semibold">{selectedCustomer.account_status}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">New Status *</label>
                <select
                  value={statusChangeData.status}
                  onChange={(e) => setStatusChangeData({ ...statusChangeData, status: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="LIMITED">Limited</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Note: FROZEN status requires admin intervention
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason (Optional)</label>
                <textarea
                  value={statusChangeData.reason}
                  onChange={(e) => setStatusChangeData({ ...statusChangeData, reason: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  rows={3}
                  placeholder="Provide a reason for the status change..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStatusChange}
                  disabled={!statusChangeData.status}
                  className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Update Status
                </button>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusChangeData({ status: "", reason: "" });
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward for Review Modal */}
      {showForwardModal && selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowForwardModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-900">Forward Account for Review</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-slate-700">
                  <strong>Customer:</strong> {selectedCustomer.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Account: {selectedCustomer.masked_account_number}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason *</label>
                <textarea
                  value={forwardData.reason}
                  onChange={(e) => setForwardData({ ...forwardData, reason: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  rows={4}
                  placeholder="Provide a detailed reason for forwarding this account..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={forwardData.priority}
                  onChange={(e) => setForwardData({ ...forwardData, priority: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleForwardForReview}
                  disabled={!forwardData.reason}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Forward
                </button>
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardData({ reason: "", priority: "normal" });
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAccounts;
