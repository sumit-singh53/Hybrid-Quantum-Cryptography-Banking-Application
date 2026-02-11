import { useEffect, useState } from "react";
import {
  fetchRiskAssessment,
  fetchRiskDetail,
  fetchRiskSummary,
} from "../../../services/managerService";
import "./TransactionRiskAssessment.css";

const TransactionRiskAssessment = () => {
  const [riskData, setRiskData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    riskLevel: "all",
    amountRange: "all",
    dateRange: "all",
    searchQuery: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [riskData, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentData, summaryData] = await Promise.all([
        fetchRiskAssessment({ limit: 200 }),
        fetchRiskSummary(),
      ]);
      setRiskData(assessmentData || []);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load risk assessment data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...riskData];

    // Risk level filter
    if (filters.riskLevel !== "all") {
      filtered = filtered.filter(
        (item) => item.risk_level === filters.riskLevel
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
        (item) => item.amount >= min && item.amount < max
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const ranges = {
        today: 1,
        week: 7,
        month: 30,
      };
      const days = ranges[filters.dateRange];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.created_at);
          return itemDate >= cutoff;
        });
      }
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.transaction_id?.toLowerCase().includes(query) ||
          item.transaction_reference?.toLowerCase().includes(query) ||
          item.customer_id_masked?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  const handleViewDetail = async (transactionId) => {
    setDetailLoading(true);
    try {
      const detail = await fetchRiskDetail(transactionId);
      setSelectedTransaction(detail);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load risk detail");
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

  const getRiskBadgeClass = (level) => {
    switch (level) {
      case "critical":
        return "risk-badge-critical";
      case "elevated":
        return "risk-badge-elevated";
      default:
        return "risk-badge-normal";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "APPROVED":
        return "status-badge-approved";
      case "REJECTED":
        return "status-badge-rejected";
      case "PENDING":
        return "status-badge-pending";
      default:
        return "status-badge-default";
    }
  };

  if (loading && riskData.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading risk assessment data...</p>
      </div>
    );
  }

  return (
    <div className="risk-assessment-container">
      <div className="page-header">
        <div>
          <p className="page-subtitle">
            Monitor high-risk and flagged transactions. All data is read-only for supervisory review.
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

      {/* Summary Statistics */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card stat-card-critical">
            <div className="stat-icon stat-icon-critical">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">High Risk Transactions</p>
              <p className="stat-value">{summary.total_high_risk}</p>
            </div>
          </div>

          <div className="stat-card stat-card-pending">
            <div className="stat-icon stat-icon-pending">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Pending High Risk</p>
              <p className="stat-value">{summary.pending_high_risk}</p>
            </div>
          </div>

          <div className="stat-card stat-card-value">
            <div className="stat-icon stat-icon-value">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">High Value Transactions</p>
              <p className="stat-value">{summary.high_value_transactions}</p>
            </div>
          </div>

          <div className="stat-card stat-card-suspicious">
            <div className="stat-icon stat-icon-suspicious">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Suspicious Patterns (7d)</p>
              <p className="stat-value">{summary.suspicious_patterns_7d}</p>
            </div>
          </div>
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

      {/* Risk Assessment List */}
      {filteredData.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No High-Risk Transactions</h3>
          <p>No transactions match your current risk criteria.</p>
        </div>
      ) : (
        <div className="risk-list">
          {filteredData.map((item) => (
            <div key={item.transaction_id} className="risk-card">
              <div className="risk-card-header">
                <div className="risk-card-title">
                  <span className="transaction-ref">{item.transaction_reference}</span>
                  <span className={`risk-badge ${getRiskBadgeClass(item.risk_level)}`}>
                    {item.risk_level}
                  </span>
                  <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <button
                  onClick={() => handleViewDetail(item.transaction_id)}
                  className="btn-view-detail"
                  disabled={detailLoading}
                >
                  View Details
                </button>
              </div>

              <div className="risk-card-body">
                <div className="risk-info-grid">
                  <div className="info-item">
                    <span className="info-label">Amount</span>
                    <span className="info-value amount">
                      ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Risk Score</span>
                    <span className="info-value">{item.risk_score}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">From Account</span>
                    <span className="info-value">{item.from_account_masked}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">To Account</span>
                    <span className="info-value">{item.to_account_masked}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created</span>
                    <span className="info-value">{formatDate(item.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Customer ID</span>
                    <span className="info-value">{item.customer_id_masked}</span>
                  </div>
                </div>

                {item.risk_indicators && item.risk_indicators.length > 0 && (
                  <div className="risk-indicators">
                    <span className="indicators-label">Risk Indicators:</span>
                    <div className="indicators-list">
                      {item.risk_indicators.map((indicator, index) => (
                        <span key={index} className="indicator-badge">
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Risk Assessment Details</h2>
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
                    <span className="detail-label">Transaction Reference</span>
                    <span className="detail-value">{selectedTransaction.transaction_reference}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Transaction ID</span>
                    <span className="detail-value">{selectedTransaction.transaction_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value amount-large">
                      ₹{Number(selectedTransaction.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`status-badge ${getStatusBadgeClass(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{formatDate(selectedTransaction.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Branch</span>
                    <span className="detail-value">{selectedTransaction.branch?.label || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Account Information (Masked)</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Sender</span>
                    <span className="detail-value">{selectedTransaction.sender_masked}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Receiver</span>
                    <span className="detail-value">{selectedTransaction.receiver_masked}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer ID</span>
                    <span className="detail-value">{selectedTransaction.customer_id_masked}</span>
                  </div>
                </div>
              </div>

              {selectedTransaction.risk_assessment && (
                <div className="detail-section">
                  <h3>Risk Assessment</h3>
                  <div className="risk-assessment-detail">
                    <div className="risk-metrics">
                      <div className="risk-metric">
                        <span className="metric-label">Risk Level</span>
                        <span className={`risk-badge ${getRiskBadgeClass(selectedTransaction.risk_assessment.risk_level)}`}>
                          {selectedTransaction.risk_assessment.risk_level}
                        </span>
                      </div>
                      <div className="risk-metric">
                        <span className="metric-label">Risk Score</span>
                        <span className="metric-value">{selectedTransaction.risk_assessment.risk_score}</span>
                      </div>
                      <div className="risk-metric">
                        <span className="metric-label">Time Risk</span>
                        <span className="metric-value">{selectedTransaction.risk_assessment.time_risk}</span>
                      </div>
                    </div>

                    {selectedTransaction.risk_assessment.risk_indicators && 
                     selectedTransaction.risk_assessment.risk_indicators.length > 0 && (
                      <div className="risk-indicators-detail">
                        <h4>Risk Indicators</h4>
                        {selectedTransaction.risk_assessment.risk_indicators.map((indicator, index) => (
                          <div key={index} className="indicator-detail">
                            <div className="indicator-header">
                              <span className="indicator-type">{indicator.type}</span>
                              <span className={`indicator-severity severity-${indicator.severity}`}>
                                {indicator.severity}
                              </span>
                            </div>
                            <p className="indicator-description">{indicator.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedTransaction.risk_assessment.velocity_metrics && (
                      <div className="velocity-metrics">
                        <h4>Velocity Metrics</h4>
                        <div className="metrics-grid">
                          <div className="metric-item">
                            <span className="metric-label">Transactions (24h)</span>
                            <span className="metric-value">
                              {selectedTransaction.risk_assessment.velocity_metrics.count_24h}
                            </span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Volume (24h)</span>
                            <span className="metric-value">
                              ₹{Number(selectedTransaction.risk_assessment.velocity_metrics.volume_24h || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Purpose</h3>
                <p className="purpose-text">{selectedTransaction.purpose || "No purpose specified"}</p>
              </div>

              <div className="modal-warning">
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  <strong>Read-Only View:</strong> This is a risk assessment view for supervisory purposes.
                  Managers cannot modify transaction data or account balances. All access is logged.
                </p>
              </div>
            </div>
            <div className="modal-footer">
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
    </div>
  );
};

export default TransactionRiskAssessment;
