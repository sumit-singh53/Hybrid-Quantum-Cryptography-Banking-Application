import React, { useEffect, useState } from "react";
import { fetchPendingTransactions, decideOnTransaction } from "../../../services/managerService";
import "./ApproveTransaction.css";

const ApproveTransaction = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    riskLevel: "all",
    amountRange: "all",
    sortBy: "date_desc",
    searchQuery: "",
  });

  useEffect(() => {
    loadPendingTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filters]);

  const loadPendingTransactions = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingTransactions();
      setTransactions(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load pending transactions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Risk level filter
    if (filters.riskLevel !== "all") {
      filtered = filtered.filter(
        (tx) => tx.risk?.level === filters.riskLevel
      );
    }

    // Amount range filter
    if (filters.amountRange !== "all") {
      const ranges = {
        low: [0, 10000],
        medium: [10000, 100000],
        high: [100000, 1000000],
        very_high: [1000000, Infinity],
      };
      const [min, max] = ranges[filters.amountRange] || [0, Infinity];
      filtered = filtered.filter(
        (tx) => tx.amount >= min && tx.amount < max
      );
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.id?.toLowerCase().includes(query) ||
          tx.from_account?.toLowerCase().includes(query) ||
          tx.to_account?.toLowerCase().includes(query) ||
          tx.purpose?.toLowerCase().includes(query)
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case "date_asc":
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "date_desc":
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "amount_asc":
        filtered.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        filtered.sort((a, b) => b.amount - a.amount);
        break;
      case "risk_desc":
        filtered.sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));
        break;
      default:
        break;
    }

    setFilteredTransactions(filtered);
  };

  const handleApprove = async (txId) => {
    setActionLoading(true);
    try {
      await decideOnTransaction(txId, { action: "approve" });
      setSuccessMessage("Transaction approved successfully");
      setShowApproveModal(null);
      await loadPendingTransactions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve transaction");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (txId) => {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is mandatory");
      return;
    }

    setActionLoading(true);
    try {
      await decideOnTransaction(txId, {
        action: "reject",
        reason: rejectionReason,
      });
      setSuccessMessage("Transaction rejected successfully");
      setShowRejectModal(null);
      setRejectionReason("");
      await loadPendingTransactions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject transaction");
    } finally {
      setActionLoading(false);
    }
  };

  const maskAccount = (account) => {
    if (!account || account.length < 8) return account;
    return `${account.substring(0, 4)}****${account.substring(account.length - 4)}`;
  };

  const getRiskBadgeClass = (level) => {
    switch (level) {
      case "critical":
        return "badge-critical";
      case "elevated":
        return "badge-elevated";
      default:
        return "badge-normal";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <div className="approve-transaction-container">
      <div className="page-header">
        <div>
          <p className="page-subtitle">
            Review and approve/reject pending transactions. All actions are logged for audit compliance.
          </p>
        </div>
        <button
          onClick={loadPendingTransactions}
          disabled={loading}
          className="btn-refresh"
        >
          <svg className={`icon ${loading ? "spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Risk Level</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="elevated">Elevated</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Amount Range</label>
          <select
            value={filters.amountRange}
            onChange={(e) => setFilters({ ...filters, amountRange: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Amounts</option>
            <option value="low">₹0 - ₹10,000</option>
            <option value="medium">₹10,000 - ₹1,00,000</option>
            <option value="high">₹1,00,000 - ₹10,00,000</option>
            <option value="very_high">Above ₹10,00,000</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="filter-select"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="risk_desc">Highest Risk</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by ID, account, or purpose..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="filter-input"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-total">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Pending</p>
            <p className="stat-value">{transactions.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-critical">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Critical Risk</p>
            <p className="stat-value">
              {transactions.filter((tx) => tx.risk?.level === "critical").length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-high">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">High Value</p>
            <p className="stat-value">
              {transactions.filter((tx) => tx.risk?.is_high_value).length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-stale">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Stale (&gt;12h)</p>
            <p className="stat-value">
              {transactions.filter((tx) => tx.risk?.stale).length}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No Pending Approvals</h3>
          <p>All transactions have been processed. Great work!</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="transaction-card">
              <div className="transaction-header">
                <div className="transaction-id-section">
                  <span className="transaction-id">{tx.id?.substring(0, 8)}...</span>
                  <span className={`risk-badge ${getRiskBadgeClass(tx.risk?.level)}`}>
                    {tx.risk?.level || "normal"}
                  </span>
                  {tx.risk?.is_high_value && (
                    <span className="badge-high-value">High Value</span>
                  )}
                  {tx.risk?.stale && (
                    <span className="badge-stale">Stale</span>
                  )}
                </div>
                <div className="transaction-actions">
                  <button
                    onClick={() => setSelectedTransaction(tx)}
                    className="btn-view-details"
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div className="transaction-body">
                <div className="transaction-info-grid">
                  <div className="info-item">
                    <span className="info-label">Amount</span>
                    <span className="info-value amount">
                      ₹{Number(tx.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">From Account</span>
                    <span className="info-value">{maskAccount(tx.from_account)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">To Account</span>
                    <span className="info-value">{maskAccount(tx.to_account)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created</span>
                    <span className="info-value">{formatDate(tx.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Age</span>
                    <span className="info-value">{tx.age_minutes?.toFixed(0) || 0} minutes</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Branch</span>
                    <span className="info-value">{tx.branch?.label || "N/A"}</span>
                  </div>
                </div>

                <div className="transaction-purpose">
                  <span className="info-label">Purpose:</span>
                  <p className="purpose-text">{tx.purpose || "No purpose specified"}</p>
                </div>
              </div>

              <div className="transaction-footer">
                <button
                  onClick={() => setShowApproveModal(tx.id)}
                  className="btn-approve"
                  disabled={actionLoading}
                >
                  <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectModal(tx.id)}
                  className="btn-reject"
                  disabled={actionLoading}
                >
                  <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Transaction Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Transaction ID</span>
                    <span className="detail-value">{selectedTransaction.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                      <span className="badge-pending">PENDING</span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value amount-large">
                      ₹{Number(selectedTransaction.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{formatDate(selectedTransaction.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Account Information (Masked)</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">From Account</span>
                    <span className="detail-value">{maskAccount(selectedTransaction.from_account)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">To Account</span>
                    <span className="detail-value">{maskAccount(selectedTransaction.to_account)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created By</span>
                    <span className="detail-value">{selectedTransaction.created_by || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Branch</span>
                    <span className="detail-value">{selectedTransaction.branch?.label || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Purpose / Remarks</h3>
                <p className="purpose-detail">{selectedTransaction.purpose || "No purpose specified"}</p>
              </div>

              <div className="detail-section">
                <h3>Risk Assessment</h3>
                <div className="risk-assessment">
                  <div className="risk-item">
                    <span className="risk-label">Risk Level</span>
                    <span className={`risk-badge ${getRiskBadgeClass(selectedTransaction.risk?.level)}`}>
                      {selectedTransaction.risk?.level || "normal"}
                    </span>
                  </div>
                  <div className="risk-item">
                    <span className="risk-label">Risk Score</span>
                    <span className="risk-value">{selectedTransaction.risk?.score || 0}</span>
                  </div>
                  <div className="risk-item">
                    <span className="risk-label">High Value</span>
                    <span className={`risk-value ${selectedTransaction.risk?.is_high_value ? "text-warning" : ""}`}>
                      {selectedTransaction.risk?.is_high_value ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="risk-item">
                    <span className="risk-label">Stale Transaction</span>
                    <span className={`risk-value ${selectedTransaction.risk?.stale ? "text-warning" : ""}`}>
                      {selectedTransaction.risk?.stale ? "Yes (>12h)" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Verification Status</h3>
                <div className="verification-status">
                  <div className="verification-item">
                    <svg className="icon-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Certificate Verified</span>
                  </div>
                  <div className="verification-item">
                    <svg className="icon-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Device Binding Validated</span>
                  </div>
                  <div className="verification-item">
                    <svg className="icon-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Signature Verified</span>
                  </div>
                </div>
              </div>

              <div className="modal-warning">
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>
                  <strong>Manager Restrictions:</strong> You cannot edit transaction amounts or accounts.
                  All approval/rejection actions are logged in the Global Audit Log.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setShowApproveModal(selectedTransaction.id);
                }}
                className="btn-approve"
              >
                Approve Transaction
              </button>
              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setShowRejectModal(selectedTransaction.id);
                }}
                className="btn-reject"
              >
                Reject Transaction
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Approval</h2>
              <button
                onClick={() => setShowApproveModal(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="confirmation-icon confirmation-icon-approve">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="confirmation-text">
                Are you sure you want to approve this transaction?
              </p>
              <p className="confirmation-subtext">
                Transaction ID: <strong>{showApproveModal.substring(0, 12)}...</strong>
              </p>
              <div className="confirmation-warning">
                This action will be logged in the audit trail and cannot be undone.
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => handleApprove(showApproveModal)}
                disabled={actionLoading}
                className="btn-approve"
              >
                {actionLoading ? "Processing..." : "Yes, Approve"}
              </button>
              <button
                onClick={() => setShowApproveModal(null)}
                disabled={actionLoading}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Rejection</h2>
              <button
                onClick={() => setShowRejectModal(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="confirmation-icon confirmation-icon-reject">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="confirmation-text">
                Are you sure you want to reject this transaction?
              </p>
              <p className="confirmation-subtext">
                Transaction ID: <strong>{showRejectModal.substring(0, 12)}...</strong>
              </p>
              <div className="form-group">
                <label className="form-label">
                  Rejection Reason <span className="required">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejection (mandatory)"
                  className="form-textarea"
                  rows="4"
                  required
                />
              </div>
              <div className="confirmation-warning">
                This action will be logged in the audit trail and cannot be undone.
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="btn-reject"
              >
                {actionLoading ? "Processing..." : "Yes, Reject"}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveTransaction;
