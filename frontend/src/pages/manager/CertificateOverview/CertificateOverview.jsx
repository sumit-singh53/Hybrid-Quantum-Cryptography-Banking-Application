import React, { useEffect, useState } from "react";
import {
  fetchCertificateOverview,
  fetchCertificateDetail,
  fetchCertificateRequestSummary,
  fetchCertificateStatistics,
} from "../../../services/managerService";
import "./CertificateOverview.css";

const CertificateOverview = () => {
  const [certificates, setCertificates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [requestSummary, setRequestSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (roleFilter) filters.role = roleFilter;
      
      const [certsData, statsData, requestData] = await Promise.all([
        fetchCertificateOverview(filters),
        fetchCertificateStatistics(),
        fetchCertificateRequestSummary(),
      ]);
      
      setCertificates(certsData || []);
      setStatistics(statsData || {});
      setRequestSummary(requestData || {});
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load certificate overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter]);

  const handleViewDetail = async (certificateId) => {
    try {
      setDetailLoading(true);
      const detail = await fetchCertificateDetail(certificateId);
      setSelectedCert(detail);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load certificate detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedCert(null);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "badge-active";
      case "expired":
        return "badge-expired";
      case "revoked":
        return "badge-revoked";
      default:
        return "badge-default";
    }
  };

  if (loading && !certificates.length) {
    return (
      <div className="certificate-overview-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading certificate overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-overview-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Certificate Overview</h1>
          <p className="page-subtitle">
            View certificate information and status (Read-Only)
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
      <div className="stats-grid">
        {statistics && (
          <>
            <div className="stat-card">
              <div className="stat-label">Total Certificates</div>
              <div className="stat-value">{statistics.total_certificates || 0}</div>
            </div>
            <div className="stat-card stat-active">
              <div className="stat-label">Active</div>
              <div className="stat-value">{statistics.active_certificates || 0}</div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-label">Expiring Soon (30d)</div>
              <div className="stat-value">{statistics.expiring_soon_30d || 0}</div>
            </div>
            <div className="stat-card stat-expired">
              <div className="stat-label">Expired</div>
              <div className="stat-value">{statistics.expired_certificates || 0}</div>
            </div>
            <div className="stat-card stat-revoked">
              <div className="stat-label">Revoked</div>
              <div className="stat-value">{statistics.revoked_certificates || 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Certificate Request Summary */}
      {requestSummary && (
        <div className="request-summary">
          <h3>Certificate Request Status</h3>
          <div className="request-stats">
            <div className="request-stat">
              <span className="request-label">Pending Requests</span>
              <span className="request-value">{requestSummary.pending_requests || 0}</span>
            </div>
            <div className="request-stat">
              <span className="request-label">Approved</span>
              <span className="request-value text-success">{requestSummary.approved_requests || 0}</span>
            </div>
            <div className="request-stat">
              <span className="request-label">Rejected</span>
              <span className="request-value text-danger">{requestSummary.rejected_requests || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Role</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="manager">Manager</option>
            <option value="auditor_clerk">Auditor Clerk</option>
            <option value="system_admin">System Admin</option>
          </select>
        </div>
        {(statusFilter || roleFilter) && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              setStatusFilter("");
              setRoleFilter("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Certificates Table */}
      <div className="certificates-table-container">
        {certificates.length === 0 ? (
          <div className="empty-state">
            <svg className="icon-large" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No certificates found</p>
            <p className="text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="certificates-table">
            <thead>
              <tr>
                <th>Certificate ID</th>
                <th>Owner</th>
                <th>Role</th>
                <th>Status</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.certificate_id}>
                  <td className="font-mono">{cert.certificate_id_masked}</td>
                  <td>{cert.owner}</td>
                  <td>
                    <span className="role-badge">{cert.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(cert.status)}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td>{new Date(cert.issue_date).toLocaleDateString()}</td>
                  <td>{new Date(cert.expiry_date).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => handleViewDetail(cert.certificate_id)}
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
      {selectedCert && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Certificate Details</h2>
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
                    <span className="detail-label">Certificate ID:</span>
                    <span className="detail-value font-mono">{selectedCert.certificate_id_masked}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Owner:</span>
                    <span className="detail-value">{selectedCert.owner}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="role-badge">{selectedCert.role}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`badge ${getStatusBadgeClass(selectedCert.status)}`}>
                      {selectedCert.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Issue Date:</span>
                    <span className="detail-value">{new Date(selectedCert.issue_date).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Expiry Date:</span>
                    <span className="detail-value">{new Date(selectedCert.expiry_date).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Issuer:</span>
                    <span className="detail-value">{selectedCert.issuer}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Purpose:</span>
                    <span className="detail-value">{selectedCert.purpose}</span>
                  </div>
                  <div className="detail-section">
                    <h3>Cryptographic Information</h3>
                    <div className="crypto-info">
                      <div className="crypto-item">
                        <strong>Classical Signature:</strong>
                        <span>{selectedCert.signature_algorithm}</span>
                      </div>
                      <div className="crypto-item">
                        <strong>Post-Quantum Signature:</strong>
                        <span>{selectedCert.pq_signature_algorithm}</span>
                      </div>
                      <div className="crypto-item">
                        <strong>Certificate Lineage:</strong>
                        <span className="font-mono">{selectedCert.lineage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="read-only-notice">
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Read-Only: Managers cannot approve, issue, revoke, or generate certificates</span>
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

export default CertificateOverview;
