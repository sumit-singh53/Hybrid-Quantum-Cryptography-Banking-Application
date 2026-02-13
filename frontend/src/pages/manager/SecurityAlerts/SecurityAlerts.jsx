import React, { useEffect, useState } from "react";
import {
  fetchSecurityAlerts,
  fetchSecurityAlertDetail,
  fetchSecurityAlertStatistics,
} from "../../../services/managerService";
import "./SecurityAlerts.css";

const SecurityAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (severityFilter) filters.severity = severityFilter;
      if (alertTypeFilter) filters.alert_type = alertTypeFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      
      const [alertsData, statsData] = await Promise.all([
        fetchSecurityAlerts(filters),
        fetchSecurityAlertStatistics(),
      ]);
      
      setAlerts(alertsData || []);
      setStatistics(statsData || {});
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load security alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter, alertTypeFilter, dateFrom, dateTo]);

  const handleViewDetail = async (alertId) => {
    try {
      setDetailLoading(true);
      const detail = await fetchSecurityAlertDetail(alertId);
      setSelectedAlert(detail);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load alert detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedAlert(null);
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "badge-high";
      case "medium":
        return "badge-medium";
      case "low":
        return "badge-low";
      default:
        return "badge-default";
    }
  };

  if (loading && !alerts.length) {
    return (
      <div className="security-alerts-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading security alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-alerts-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-subtitle">
            Monitor security events and anomalies (Read-Only)
          </p>
        </div>
        <button onClick={loadData} className="btn-refresh" disabled={loading}>
          <svg className={`icon ${loading ? "spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Alerts</div>
            <div className="stat-value">{statistics.total_alerts || 0}</div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-label">High Severity</div>
            <div className="stat-value">{statistics.high_severity || 0}</div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-label">Medium Severity</div>
            <div className="stat-value">{statistics.medium_severity || 0}</div>
          </div>
          <div className="stat-card stat-low">
            <div className="stat-label">Low Severity</div>
            <div className="stat-value">{statistics.low_severity || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Recent (24h)</div>
            <div className="stat-value">{statistics.recent_24h || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Severity</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Alert Type</label>
          <input
            type="text"
            placeholder="Filter by type..."
            value={alertTypeFilter}
            onChange={(e) => setAlertTypeFilter(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(severityFilter || alertTypeFilter || dateFrom || dateTo) && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              setSeverityFilter("");
              setAlertTypeFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Alerts Table */}
      <div className="alerts-table-container">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <svg className="icon-large" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p>No security alerts found</p>
            <p className="text-muted">All systems operating normally</p>
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Alert Type</th>
                <th>Severity</th>
                <th>Affected Account</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_id}>
                  <td className="font-mono">{alert.alert_id?.substring(0, 12)}...</td>
                  <td>{alert.alert_type}</td>
                  <td>
                    <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="font-mono">{alert.affected_account}</td>
                  <td>{new Date(alert.timestamp).toLocaleString()}</td>
                  <td>
                    <span className="badge badge-default">{alert.status}</span>
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => handleViewDetail(alert.alert_id)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alert Details</h2>
              <button className="btn-close" onClick={handleCloseDetail}>
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading details...</p>
                </div>
              ) : (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Alert ID:</span>
                    <span className="detail-value font-mono">{selectedAlert.alert_id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Alert Type:</span>
                    <span className="detail-value">{selectedAlert.alert_type}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Severity:</span>
                    <span className={`badge ${getSeverityBadgeClass(selectedAlert.severity)}`}>
                      {selectedAlert.severity}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Affected Account:</span>
                    <span className="detail-value font-mono">{selectedAlert.affected_account}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value">{selectedAlert.role}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="badge badge-default">{selectedAlert.status}</span>
                  </div>
                  <div className="detail-section">
                    <h3>Description</h3>
                    <p>{selectedAlert.description}</p>
                  </div>
                  <div className="detail-section">
                    <h3>Action Taken</h3>
                    <p>{selectedAlert.action_taken}</p>
                  </div>
                  <div className="read-only-notice">
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Read-Only: Managers cannot resolve or delete security alerts</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAlerts;
