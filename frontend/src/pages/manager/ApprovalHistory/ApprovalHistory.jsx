import { useEffect, useState } from "react";
import {
  fetchApprovalHistory,
  fetchApprovalDetail,
  fetchApprovalStatistics,
} from "../../../services/managerService";
import "./ApprovalHistory.css";

const ApprovalHistory = () => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    decision: "all",
    dateRange: "all",
    amountRange: "all",
    searchQuery: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        fetchApprovalHistory({ limit: 200 }),
        fetchApprovalStatistics(),
      ]);
      setHistory(historyData || []);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load approval history");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    // Decision filter
    if (filters.decision !== "all") {
      filtered = filtered.filter(
        (record) => record.decision?.toLowerCase() === filters.decision.toLowerCase()
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const ranges = {
        today: 1,
        week: 7,
        month: 30,
        quarter: 90,
      };
      const days = ranges[filters.dateRange];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((record) => {
          const recordDate = new Date(record.decision_timestamp);
          return recordDate >= cutoff;
        });
      }
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
        (record) => record.amount >= min && record.amount < max
      );
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.id?.toLowerCase().includes(query) ||
          record.approval_reference?.toLowerCase().includes(query) ||
          record.customer_id_masked?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  };

  const handleViewDetail = async (transactionId) => {
    setDetailLoading(true);
    try {
      const detail = await fetchApprovalDetail(transactionId);
      setSelectedRecord(detail);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load approval detail");
    } finally {
      setDetailLoading(false);
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

  const getDecisionBadgeClass = (decision) => {
    return decision === "APPROVED" ? "badge-approved" : "badge-rejected";
  };

  if (loading && history.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading approval history...</p>
      </div>
    );
  }

  return (
    <div className="approval-history-container">
      <div className="page-header">
        <div>
          <p className="page-subtitle">
            View historical approval and rejection records. All data is read-only and logged for audit compliance.
          </p>
        </div>
        <button
          onClick={loadData}
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

      {/* Statistics Cards */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Processed</p>
              <p className="stat-value">{statistics.total_processed}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-approved">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Approved</p>
              <p className="stat-value">{statistics.total_approved}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-rejected">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Rejected</p>
              <p className="stat-value">{statistics.total_rejected}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-rate">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Approval Rate</p>
              <p className="stat-value">{statistics.approval_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Decision Type</label>
          <select
            value={filters.decision}
            onChange={(e) => setFilters({ ...filters, decision: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
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

        <div className="filter-group search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by ID or reference..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="filter-input"
          />
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No Records Found</h3>
          <p>No approval history matches your current filters.</p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Approval Reference</th>
                <th>Transaction ID</th>
                <th>Decision</th>
                <th>Amount</th>
                <th>Customer ID</th>
                <th>Decision Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((record) => (
                <tr key={record.id}>
                  <td>
                    <span className="reference-id">{record.approval_reference}</span>
                  </td>
                  <td>
                    <span className="transaction-id">{record.id?.substring(0, 12)}...</span>
                  </td>
                  <td>
                    <span className={`decision-badge ${getDecisionBadgeClass(record.decision)}`}>
                      {record.decision}
                    </span>
                  </td>
                  <td className="amount-cell">
                    ₹{Number(record.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className="masked-id">{record.customer_id_masked}</span>
                  </td>
                  <td>{formatDate(record.decision_timestamp)}</td>
                  <td>
                    <button
                      onClick={() => handleViewDetail(record.id)}
                      className="btn-view-detail"
                      disabled={detailLoading}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approval Record Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Approval Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Approval Reference</span>
                    <span className="detail-value">{selectedRecord.approval_reference}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Transaction ID</span>
                    <span className="detail-value">{selectedRecord.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Decision</span>
                    <span className={`decision-badge ${getDecisionBadgeClass(selectedRecord.decision)}`}>
                      {selectedRecord.decision}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Decision Timestamp</span>
                    <span className="detail-value">{formatDate(selectedRecord.decision_timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Transaction Summary</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value amount-large">
                      ₹{Number(selectedRecord.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">From Account</span>
                    <span className="detail-value">{selectedRecord.from_account_masked}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">To Account</span>
                    <span className="detail-value">{selectedRecord.to_account_masked}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer ID</span>
                    <span className="detail-value">{selectedRecord.customer_id_masked}</span>
                  </div>
                </div>
              </div>

              {selectedRecord.transaction_summary && (
                <div className="detail-section">
                  <h3>Processing Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Created At</span>
                      <span className="detail-value">
                        {formatDate(selectedRecord.transaction_summary.created_at)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Processing Time</span>
                      <span className="detail-value">
                        {selectedRecord.transaction_summary.processing_time_minutes
                          ? `${selectedRecord.transaction_summary.processing_time_minutes} minutes`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Purpose</span>
                      <span className="detail-value">{selectedRecord.purpose || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-warning">
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  <strong>Read-Only View:</strong> This is a historical record and cannot be modified.
                  All approval actions are permanently logged in the audit trail.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistory;
