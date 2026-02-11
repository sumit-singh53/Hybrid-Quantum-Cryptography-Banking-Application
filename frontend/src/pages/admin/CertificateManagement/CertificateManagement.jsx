import React, { useState, useEffect } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./CertificateManagement.css";

const CertificateManagement = () => {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Pagination
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [certsPage, setCertsPage] = useState(1);
  const [certsTotal, setCertsTotal] = useState(0);
  const limit = 10;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("");
  
  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  
  // Form data
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [revocationReason, setRevocationReason] = useState("");

  useEffect(() => {
    loadStatistics();
    if (activeTab === "requests") {
      loadRequests();
    } else if (activeTab === "certificates") {
      loadCertificates();
    }
  }, [activeTab, requestsPage, certsPage, statusFilter, requestTypeFilter]);

  const loadStatistics = async () => {
    try {
      const stats = await systemAdminService.getCertificateRequestStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await systemAdminService.getCertificateRequests({
        page: requestsPage,
        limit,
        status: statusFilter,
        request_type: requestTypeFilter,
      });
      setRequests(data.requests || []);
      setRequestsTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load certificate requests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await systemAdminService.getIssuedCertificates({
        page: certsPage,
        limit,
      });
      setCertificates(data.certificates || []);
      setCertsTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load issued certificates");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await systemAdminService.approveCertificateRequest(selectedRequest.id, {
        admin_notes: adminNotes,
      });
      setSuccess(`Certificate request #${selectedRequest.id} approved successfully`);
      setShowApproveModal(false);
      setAdminNotes("");
      setSelectedRequest(null);
      loadRequests();
      loadStatistics();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await systemAdminService.rejectCertificateRequest(selectedRequest.id, {
        rejection_reason: rejectionReason,
      });
      setSuccess(`Certificate request #${selectedRequest.id} rejected`);
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedRequest(null);
      loadRequests();
      loadStatistics();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!selectedCertificate || !revocationReason.trim()) {
      setError("Revocation reason is required");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await systemAdminService.revokeCertificate({
        certificate_id: selectedCertificate.certificate_id,
        reason: revocationReason,
      });
      setSuccess(`Certificate ${selectedCertificate.certificate_id} revoked successfully`);
      setShowRevokeModal(false);
      setRevocationReason("");
      setSelectedCertificate(null);
      loadCertificates();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke certificate");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: "badge-warning",
      APPROVED: "badge-success",
      REJECTED: "badge-danger",
    };
    return badges[status] || "badge-secondary";
  };

  const getCertStatusBadge = (isRevoked) => {
    return isRevoked ? "badge-danger" : "badge-success";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="certificate-management">

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon pending">📋</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.pending || 0}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved">✅</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.approved || 0}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rejected">❌</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.rejected || 0}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total">📊</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.total || 0}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger">
          <span className="alert-icon">⚠️</span>
          {error}
          <button className="alert-close" onClick={() => setError("")}>×</button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {success}
          <button className="alert-close" onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          Certificate Requests
        </button>
        <button
          className={`tab ${activeTab === "certificates" ? "active" : ""}`}
          onClick={() => setActiveTab("certificates")}
        >
          Issued Certificates
        </button>
      </div>

      {/* Certificate Requests Tab */}
      {activeTab === "requests" && (
        <div className="tab-content">
          {/* Filters */}
          <div className="filters">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setRequestsPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            
            <select
              value={requestTypeFilter}
              onChange={(e) => {
                setRequestTypeFilter(e.target.value);
                setRequestsPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="NEW">New</option>
              <option value="RENEWAL">Renewal</option>
            </select>
            
            <button onClick={loadRequests} className="btn-refresh">
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No certificate requests found</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Customer ID</th>
                      <th>Full Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Request Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td>#{req.id}</td>
                        <td>{req.user_id}</td>
                        <td>{req.full_name}</td>
                        <td>
                          <span className="badge badge-info">{req.request_type}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>{formatDate(req.created_at)}</td>
                        <td>
                          <div className="action-buttons">
                            {req.status === "PENDING" && (
                              <>
                                <button
                                  className="btn-action btn-approve"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowApproveModal(true);
                                  }}
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn-action btn-reject"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowRejectModal(true);
                                  }}
                                  title="Reject"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            {req.status !== "PENDING" && (
                              <span className="text-muted">
                                {req.status === "APPROVED" ? "Approved" : "Rejected"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() => setRequestsPage(requestsPage - 1)}
                  disabled={requestsPage === 1}
                  className="btn-page"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {requestsPage} of {Math.ceil(requestsTotal / limit) || 1}
                </span>
                <button
                  onClick={() => setRequestsPage(requestsPage + 1)}
                  disabled={requestsPage >= Math.ceil(requestsTotal / limit)}
                  className="btn-page"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Issued Certificates Tab */}
      {activeTab === "certificates" && (
        <div className="tab-content">
          <div className="filters">
            <button onClick={loadCertificates} className="btn-refresh">
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No issued certificates found</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Certificate ID</th>
                      <th>User ID</th>
                      <th>Role</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert, index) => (
                      <tr key={index}>
                        <td className="cert-id">{cert.certificate_id}</td>
                        <td>{cert.user_id || cert.certificate_id}</td>
                        <td>
                          <span className="badge badge-info">{cert.role}</span>
                        </td>
                        <td>{formatDate(cert.issued_at)}</td>
                        <td>{formatDate(cert.valid_to)}</td>
                        <td>
                          <span className={`badge ${getCertStatusBadge(cert.is_revoked)}`}>
                            {cert.is_revoked ? "Revoked" : "Active"}
                          </span>
                        </td>
                        <td>
                          {!cert.is_revoked && (
                            <button
                              className="btn-action btn-revoke"
                              onClick={() => {
                                setSelectedCertificate(cert);
                                setShowRevokeModal(true);
                              }}
                              title="Revoke Certificate"
                            >
                              🚫 Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() => setCertsPage(certsPage - 1)}
                  disabled={certsPage === 1}
                  className="btn-page"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {certsPage} of {Math.ceil(certsTotal / limit) || 1}
                </span>
                <button
                  onClick={() => setCertsPage(certsPage + 1)}
                  disabled={certsPage >= Math.ceil(certsTotal / limit)}
                  className="btn-page"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approve Certificate Request</h2>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to approve certificate request{" "}
                <strong>#{selectedRequest?.id}</strong> for{" "}
                <strong>{selectedRequest?.full_name}</strong>?
              </p>
              <div className="form-group">
                <label>Admin Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows="3"
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowApproveModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleApproveRequest}
                disabled={loading}
              >
                {loading ? "Approving..." : "Approve & Issue Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Certificate Request</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Reject certificate request <strong>#{selectedRequest?.id}</strong> for{" "}
                <strong>{selectedRequest?.full_name}</strong>?
              </p>
              <div className="form-group">
                <label>
                  Rejection Reason <span className="required">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows="3"
                  className="form-control"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectRequest}
                disabled={loading || !rejectionReason.trim()}
              >
                {loading ? "Rejecting..." : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="modal-overlay" onClick={() => setShowRevokeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Revoke Certificate</h2>
              <button className="modal-close" onClick={() => setShowRevokeModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <span className="warning-icon">⚠️</span>
                <p>
                  This action will immediately revoke the certificate and the user will lose
                  access to the system.
                </p>
              </div>
              <p>
                Certificate ID: <strong>{selectedCertificate?.certificate_id}</strong>
              </p>
              <div className="form-group">
                <label>
                  Revocation Reason <span className="required">*</span>
                </label>
                <textarea
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="Provide a reason for revocation (e.g., security incident, policy violation)..."
                  rows="3"
                  className="form-control"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRevokeModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRevokeCertificate}
                disabled={loading || !revocationReason.trim()}
              >
                {loading ? "Revoking..." : "Revoke Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManagement;
