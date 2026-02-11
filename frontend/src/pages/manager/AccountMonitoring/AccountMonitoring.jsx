import React, { useEffect, useState, useMemo } from "react";
import { 
  fetchCustomerAccounts, 
  getCustomerAccountDetails, 
  updateAccountStatus, 
  forwardAccountForReview,
  getAccountStatistics 
} from "../../../services/managerService";
import "./AccountMonitoring.css";

const AccountMonitoring = () => {
  const [accounts, setAccounts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  
  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [forwardReason, setForwardReason] = useState("");
  const [forwardPriority, setForwardPriority] = useState("normal");
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomerAccounts(statusFilter, accountTypeFilter);
      setAccounts(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await getAccountStatistics();
      setStatistics(data);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [statusFilter, accountTypeFilter]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleViewDetails = async (customerId) => {
    setLoading(true);
    try {
      const data = await getCustomerAccountDetails(customerId);
      setSelectedAccount(data);
      setShowDetailModal(true);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load account details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedAccount || !newStatus) {
      setError("Please select a status");
      return;
    }

    setLoading(true);
    try {
      await updateAccountStatus(selectedAccount.customer_id, newStatus, statusReason);
      setSuccess(`Account status updated to ${newStatus}`);
      setShowStatusModal(false);
      setNewStatus("");
      setStatusReason("");
      loadAccounts();
      loadStatistics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleForwardForReview = async () => {
    if (!selectedAccount || !forwardReason) {
      setError("Please provide a reason");
      return;
    }

    setLoading(true);
    try {
      await forwardAccountForReview(selectedAccount.customer_id, forwardReason, forwardPriority);
      setSuccess("Account forwarded for review");
      setShowForwardModal(false);
      setForwardReason("");
      setForwardPriority("normal");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to forward account");
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

  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = accounts;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(acc => 
        acc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.customer_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.masked_account_number?.includes(searchQuery)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === "balance") {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [accounts, searchQuery, sortConfig]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "LIMITED":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "FROZEN":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  const getKYCStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "rejected":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-800">
          Account Monitoring
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Supervisory dashboard for monitoring customer accounts with read-only access and limited management actions.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-700">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Manager Supervisory Access • Read-Only + Limited Actions
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Accounts
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">
              {statistics.total_accounts || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Active
            </p>
            <h3 className="mt-2 text-3xl font-bold text-emerald-800">
              {statistics.active || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Limited
            </p>
            <h3 className="mt-2 text-3xl font-bold text-amber-800">
              {statistics.limited || 0}
            </h3>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Frozen
            </p>
            <h3 className="mt-2 text-3xl font-bold text-rose-800">
              {statistics.frozen || 0}
            </h3>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
          Filters & Search
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Search</label>
            <input
              type="text"
              placeholder="Search by name, ID, or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Account Status</label>
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="limited">Limited</option>
              <option value="frozen">Frozen</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Account Type</label>
            <select
              value={accountTypeFilter || ""}
              onChange={(e) => setAccountTypeFilter(e.target.value || null)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">All Types</option>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="fixed_deposit">Fixed Deposit</option>
            </select>
          </div>
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

      {/* Accounts Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700">
            <tr>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("customer_id")}
              >
                Customer ID {sortConfig.key === "customer_id" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("name")}
              >
                Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">Account Number</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Status</th>
              <th 
                className="cursor-pointer px-5 py-4 hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("balance")}
              >
                Balance {sortConfig.key === "balance" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-5 py-4">KYC Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredAndSortedAccounts.map((acc) => (
              <tr key={acc.customer_id} className="transition-colors hover:bg-slate-50">
                <td className="px-5 py-4 font-mono text-xs text-slate-600">
                  {acc.customer_id}
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">{acc.name}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-700">{acc.masked_account_number}</td>
                <td className="px-5 py-4 text-xs uppercase text-slate-600">
                  {acc.account_type}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(acc.account_status)}`}>
                    {acc.account_status}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">
                  ₹ {Number(acc.balance).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getKYCStatusColor(acc.kyc_status)}`}>
                    {acc.kyc_status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleViewDetails(acc.customer_id)}
                    className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredAndSortedAccounts.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan="8">
                  {searchQuery || statusFilter || accountTypeFilter
                    ? "No accounts match the current filters."
                    : "No accounts found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Account Detail Modal */}
      {showDetailModal && selectedAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" 
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Account Details</h3>
                <p className="mt-1 font-mono text-sm text-slate-600">
                  Customer ID: {selectedAccount.customer_id}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-700">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Supervisory View
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
              {/* Account Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Account Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Customer Name</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-800">
                      {selectedAccount.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Account Number</p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-800">
                      {selectedAccount.masked_account_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Account Type</p>
                    <p className="mt-1.5 text-sm uppercase text-slate-700">
                      {selectedAccount.account_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Account Status</p>
                    <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedAccount.account_status)}`}>
                      {selectedAccount.account_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Current Balance</p>
                    <p className="mt-1.5 text-lg font-bold text-slate-800">
                      ₹ {Number(selectedAccount.balance).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Branch Code</p>
                    <p className="mt-1.5 font-mono text-sm text-slate-700">
                      {selectedAccount.branch_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* KYC Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                  KYC Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">KYC Status</p>
                    <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getKYCStatusColor(selectedAccount.kyc_status)}`}>
                      {selectedAccount.kyc_status}
                    </span>
                  </div>
                  {selectedAccount.kyc_verified_at && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Verified At</p>
                      <p className="mt-1.5 text-sm text-slate-700">
                        {new Date(selectedAccount.kyc_verified_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedAccount.kyc_verified_by && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Verified By</p>
                      <p className="mt-1.5 text-sm text-slate-700">
                        {selectedAccount.kyc_verified_by}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              {(selectedAccount.email || selectedAccount.mobile) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                    Contact Information
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedAccount.email && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Email</p>
                        <p className="mt-1.5 text-sm text-slate-700">
                          {selectedAccount.email}
                        </p>
                      </div>
                    )}
                    {selectedAccount.mobile && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Mobile</p>
                        <p className="mt-1.5 text-sm text-slate-700">
                          {selectedAccount.mobile}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Timeline
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Account Created</p>
                    <p className="mt-1.5 text-sm text-slate-700">
                      {selectedAccount.created_at 
                        ? new Date(selectedAccount.created_at).toLocaleString() 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Last Updated</p>
                    <p className="mt-1.5 text-sm text-slate-700">
                      {selectedAccount.updated_at 
                        ? new Date(selectedAccount.updated_at).toLocaleString() 
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Manager Supervisory Access</p>
                    <p className="mt-1 text-xs text-amber-700">
                      You have read-only access to account information. You can flag accounts for review or update status to LIMITED/ACTIVE only. 
                      Balance modifications and transactions require customer action. All supervisory actions are logged.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowStatusModal(true);
                  }}
                  disabled={selectedAccount.account_status === "FROZEN"}
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Update Status
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowForwardModal(true);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                >
                  Forward for Review
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" 
          onClick={() => setShowStatusModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-800">Update Account Status</h3>
              <p className="mt-1 text-sm text-slate-600">
                Customer: {selectedAccount.name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="">Select Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="LIMITED">Limited</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Note: FROZEN status requires system administrator intervention
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason (Optional)</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Provide reason for status change..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    This action will be logged in the audit trail. Ensure you have proper authorization.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={loading || !newStatus}
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating..." : "Update Status"}
                </button>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setNewStatus("");
                    setStatusReason("");
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward for Review Modal */}
      {showForwardModal && selectedAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" 
          onClick={() => setShowForwardModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-800">Forward Account for Review</h3>
              <p className="mt-1 text-sm text-slate-600">
                Customer: {selectedAccount.name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={forwardPriority}
                  onChange={(e) => setForwardPriority(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason *</label>
                <textarea
                  value={forwardReason}
                  onChange={(e) => setForwardReason(e.target.value)}
                  placeholder="Provide detailed reason for forwarding this account..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">
                    This will create an escalation for the compliance/admin team to review this account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleForwardForReview}
                  disabled={loading || !forwardReason}
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Forwarding..." : "Forward Account"}
                </button>
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardReason("");
                    setForwardPriority("normal");
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
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

export default AccountMonitoring;
