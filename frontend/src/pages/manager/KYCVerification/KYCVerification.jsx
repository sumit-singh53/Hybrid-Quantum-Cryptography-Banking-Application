import React, { useEffect, useState, useMemo } from "react";
import {
  fetchAllKYC,
  fetchKYCDetails,
  fetchKYCStatistics,
  verifyKYC,
  rejectKYC,
} from "../../../services/managerService";
import "./KYCVerification.css";

const KYCVerification = () => {
  const [customers, setCustomers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllKYC(statusFilter === "all" ? null : statusFilter);
      setCustomers(data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load KYC data");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await fetchKYCStatistics();
      setStatistics(data);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  const loadCustomerDetails = async (customerId) => {
    setDetailsLoading(true);
    try {
      const data = await fetchKYCDetails(customerId);
      setCustomerDetails(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load customer details");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadStatistics();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerDetails(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.username?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.full_name?.toLowerCase().includes(query) ||
        customer.id?.toString().includes(query)
    );
  }, [customers, searchQuery]);

  const handleVerify = async (customerId) => {
    setError(null);
    setSuccess(null);
    try {
      await verifyKYC(customerId, remarks);
      setSuccess("KYC verified successfully");
      setRemarks("");
      setActionModal(null);
      setSelectedCustomer(null);
      setCustomerDetails(null);
      loadCustomers();
      loadStatistics();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to verify KYC");
    }
  };

  const handleReject = async (customerId) => {
    if (!reason || reason.trim().length === 0) {
      setError("Rejection reason is required");
      return;
    }
    
    setError(null);
    setSuccess(null);
    try {
      await rejectKYC(customerId, reason);
      setSuccess("KYC rejected");
      setReason("");
      setActionModal(null);
      setSelectedCustomer(null);
      setCustomerDetails(null);
      loadCustomers();
      loadStatistics();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject KYC");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rejected: "bg-rose-100 text-rose-700 border-rose-200",
      incomplete: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return badges[status] || badges.incomplete;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          KYC Verification
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Review and verify customer KYC (Know Your Customer) documentation and information.
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Total Customers
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">
              {statistics.total}
            </h3>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-600">
              Pending Verification
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-amber-900">
              {statistics.pending}
            </h3>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-600">
              Verified
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-emerald-900">
              {statistics.verified}
            </h3>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wide text-rose-600">
              Rejected
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-rose-900">
              {statistics.rejected}
            </h3>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name, email, username, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => {
            loadCustomers();
            loadStatistics();
          }}
          disabled={loading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ {success}
        </div>
      )}

      {/* Customer Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Verified By</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan="6">
                  Loading KYC data...
                </td>
              </tr>
            )}
            {!loading && filteredCustomers.map((customer) => (
              <tr key={customer.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {customer.full_name || customer.username}
                    </p>
                    <p className="text-xs text-slate-500">@{customer.username}</p>
                  </div>
                </td>
                <td className="px-4 py-3">{customer.email || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
                      customer.kyc_status
                    )}`}
                  >
                    {customer.kyc_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDate(customer.kyc_submitted_at || customer.created_at)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {customer.kyc_verified_by || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      View Details
                    </button>
                    {customer.kyc_status === "pending" && (
                      <>
                        <button
                          onClick={() => setActionModal({ type: "verify", customer })}
                          className="rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => setActionModal({ type: "reject", customer })}
                          className="rounded-2xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan="6">
                  {searchQuery || statusFilter !== "all"
                    ? "No customers match the current filters."
                    : "No customers found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => {
            setSelectedCustomer(null);
            setCustomerDetails(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  {selectedCustomer.full_name || selectedCustomer.username}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Customer ID: {selectedCustomer.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerDetails(null);
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-8 text-center text-slate-500">
                Loading customer details...
              </div>
            ) : customerDetails ? (
              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Basic Information
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Username
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        @{customerDetails.username}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Email
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {customerDetails.email || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {customerDetails.phone || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Account Status
                      </p>
                      <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                        {customerDetails.account_status || "active"}
                      </p>
                    </div>
                  </div>
                  {customerDetails.address && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Address
                      </p>
                      <p className="mt-1 text-sm text-slate-900">
                        {customerDetails.address}
                      </p>
                    </div>
                  )}
                </div>

                {/* KYC Status */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    KYC Status
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Current Status
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
                          customerDetails.kyc_status
                        )}`}
                      >
                        {customerDetails.kyc_status}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Submitted On
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(customerDetails.kyc_submitted_at || customerDetails.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification History */}
                {customerDetails.kyc_verified_by && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Verification History
                    </h4>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Verified/Rejected By
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {customerDetails.kyc_verified_by}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Date & Time
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDateTime(customerDetails.kyc_verified_at)}
                          </p>
                        </div>
                      </div>
                      {customerDetails.kyc_remarks && (
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Remarks
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {customerDetails.kyc_remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Notice */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-amber-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Security & Compliance Notice
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        All KYC verification actions are logged in the Global Audit System. 
                        Managers cannot edit customer personal data or upload documents. 
                        Sensitive identifiers are masked for security.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 border-t border-slate-200 pt-4">
                  {customerDetails.kyc_status === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setActionModal({ type: "verify", customer: selectedCustomer });
                          setSelectedCustomer(null);
                          setCustomerDetails(null);
                        }}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        ✓ Verify KYC
                      </button>
                      <button
                        onClick={() => {
                          setActionModal({ type: "reject", customer: selectedCustomer });
                          setSelectedCustomer(null);
                          setCustomerDetails(null);
                        }}
                        className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                      >
                        ✕ Reject KYC
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerDetails(null);
                    }}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Failed to load customer details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Modal (Verify/Reject) */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => {
            setActionModal(null);
            setRemarks("");
            setReason("");
            setError(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-900">
              {actionModal.type === "verify" ? "✓ Verify KYC" : "✕ Reject KYC"}
            </h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {actionModal.customer.full_name || actionModal.customer.username}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {actionModal.customer.email || actionModal.customer.username}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ID: {actionModal.customer.id}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {actionModal.type === "verify" ? "Remarks (Optional)" : "Rejection Reason *"}
                </label>
                <textarea
                  value={actionModal.type === "verify" ? remarks : reason}
                  onChange={(e) =>
                    actionModal.type === "verify"
                      ? setRemarks(e.target.value)
                      : setReason(e.target.value)
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  rows={4}
                  placeholder={
                    actionModal.type === "verify"
                      ? "Add any remarks about the verification..."
                      : "Provide a detailed reason for rejection..."
                  }
                />
                {actionModal.type === "reject" && (
                  <p className="mt-1 text-xs text-slate-500">
                    * Rejection reason is mandatory and will be logged in the audit system
                  </p>
                )}
              </div>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    actionModal.type === "verify"
                      ? handleVerify(actionModal.customer.id)
                      : handleReject(actionModal.customer.id)
                  }
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                    actionModal.type === "verify"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionModal.type === "verify" ? "Verify" : "Reject"}
                </button>
                <button
                  onClick={() => {
                    setActionModal(null);
                    setRemarks("");
                    setReason("");
                    setError(null);
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

export default KYCVerification;
