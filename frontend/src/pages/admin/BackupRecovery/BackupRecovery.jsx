import React, { useState, useEffect } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./BackupRecovery.css";

const BackupRecovery = () => {
  const [backups, setBackups] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("backup");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [verifyingBackup, setVerifyingBackup] = useState(null);

  useEffect(() => {
    fetchBackups();
    fetchStatistics();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await systemAdminService.getBackups();
      setBackups(response.backups || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await systemAdminService.getBackupStatistics();
      setStatistics(response);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      setError(null);
      await systemAdminService.createBackup({
        backup_type: "manual",
        description: "Manual backup created from admin panel",
      });
      setSuccess("Backup created successfully");
      await fetchBackups();
      await fetchStatistics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleVerifyBackup = async (backupId) => {
    try {
      setVerifyingBackup(backupId);
      const response = await systemAdminService.verifyBackup(backupId);
      if (response.verified) {
        setSuccess(`Backup ${backupId} integrity verified`);
      } else {
        setError(`Backup ${backupId} integrity check failed`);
      }
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify backup");
    } finally {
      setVerifyingBackup(null);
    }
  };

  const handleRestoreBackup = async () => {
    if (restoreConfirmation !== "RESTORE") {
      setError('Please type "RESTORE" to confirm');
      return;
    }

    try {
      setLoading(true);
      await systemAdminService.restoreBackup(selectedBackup.backup_id, {
        confirmed: true,
      });
      setSuccess("System restored successfully from backup");
      setShowRestoreModal(false);
      setRestoreConfirmation("");
      await fetchBackups();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore backup");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm("Are you sure you want to delete this backup?")) {
      return;
    }

    try {
      await systemAdminService.deleteBackup(backupId);
      setSuccess("Backup deleted successfully");
      await fetchBackups();
      await fetchStatistics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete backup");
    }
  };

  const openRestoreModal = (backup) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
    setRestoreConfirmation("");
  };

  const getStatusBadge = (status) => {
    const badges = {
      success: { class: "status-success", icon: "✓", text: "Success" },
      failed: { class: "status-failed", icon: "✗", text: "Failed" },
      in_progress: { class: "status-progress", icon: "⟳", text: "In Progress" },
    };
    const badge = badges[status] || badges.success;
    return (
      <span className={`status-badge ${badge.class}`}>
        <span className="status-icon">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (loading && !backups.length) {
    return (
      <div className="backup-recovery-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading backup data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="backup-recovery-container">
      <div className="backup-header">
        <div className="header-content">
          <h1 className="backup-title">
            <span className="title-icon">💾</span>
            Backup & Recovery
          </h1>
          <p className="backup-subtitle">
            Manage system backups and restore operations
          </p>
        </div>

        {statistics && (
          <div className="backup-summary-cards">
            <div className="summary-card">
              <div className="summary-icon">📦</div>
              <div className="summary-content">
                <div className="summary-value">{statistics.total_backups}</div>
                <div className="summary-label">Total Backups</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <div className="summary-value">{statistics.successful_backups}</div>
                <div className="summary-label">Successful</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">💽</div>
              <div className="summary-content">
                <div className="summary-value">{statistics.total_size_mb} MB</div>
                <div className="summary-label">Total Size</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <div className="backup-tabs">
        <button
          className={`tab-button ${activeTab === "backup" ? "active" : ""}`}
          onClick={() => setActiveTab("backup")}
        >
          <span className="tab-icon">💾</span>
          Backup Management
        </button>
        <button
          className={`tab-button ${activeTab === "recovery" ? "active" : ""}`}
          onClick={() => setActiveTab("recovery")}
        >
          <span className="tab-icon">🔄</span>
          Recovery Operations
        </button>
      </div>

      {activeTab === "backup" && (
        <div className="backup-section">
          <div className="section-header">
            <h2>Create New Backup</h2>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="btn btn-primary"
            >
              {creatingBackup ? (
                <>
                  <span className="spinner-small"></span>
                  Creating Backup...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Create Manual Backup
                </>
              )}
            </button>
          </div>

          <div className="backup-list">
            <h3>Backup History</h3>
            {backups.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📦</span>
                <p>No backups found</p>
                <p className="empty-subtitle">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="backup-table">
                <table>
                  <thead>
                    <tr>
                      <th>Backup ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>Created</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id}>
                        <td className="backup-id">{backup.backup_id}</td>
                        <td>
                          <span className="backup-type">{backup.backup_type}</span>
                        </td>
                        <td>{getStatusBadge(backup.status)}</td>
                        <td>{backup.backup_size_mb} MB</td>
                        <td>{formatDate(backup.created_at)}</td>
                        <td>{backup.created_by}</td>
                        <td className="actions-cell">
                          <button
                            onClick={() => handleVerifyBackup(backup.backup_id)}
                            disabled={verifyingBackup === backup.backup_id}
                            className="btn-icon"
                            title="Verify Integrity"
                          >
                            {verifyingBackup === backup.backup_id ? "⟳" : "🔍"}
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup.backup_id)}
                            className="btn-icon btn-danger"
                            title="Delete Backup"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "recovery" && (
        <div className="recovery-section">
          <div className="warning-banner">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <h3>Critical Warning</h3>
              <p>
                Recovery operations will restore the system to a previous state. All
                current data will be replaced. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="recovery-list">
            <h3>Available Backups for Recovery</h3>
            {backups.filter((b) => b.status === "success").length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🔄</span>
                <p>No successful backups available for recovery</p>
              </div>
            ) : (
              <div className="backup-table">
                <table>
                  <thead>
                    <tr>
                      <th>Backup ID</th>
                      <th>Created</th>
                      <th>Size</th>
                      <th>Integrity</th>
                      <th>Last Restored</th>
                      <th>Restore Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups
                      .filter((b) => b.status === "success")
                      .map((backup) => (
                        <tr key={backup.id}>
                          <td className="backup-id">{backup.backup_id}</td>
                          <td>{formatDate(backup.created_at)}</td>
                          <td>{backup.backup_size_mb} MB</td>
                          <td>
                            {backup.integrity_verified ? (
                              <span className="integrity-verified">✓ Verified</span>
                            ) : (
                              <span className="integrity-unverified">? Unknown</span>
                            )}
                          </td>
                          <td>
                            {backup.last_restored_at
                              ? formatDate(backup.last_restored_at)
                              : "Never"}
                          </td>
                          <td>{backup.restore_count || 0}</td>
                          <td className="actions-cell">
                            <button
                              onClick={() => openRestoreModal(backup)}
                              className="btn btn-warning"
                            >
                              🔄 Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showRestoreModal && selectedBackup && (
        <div className="modal-overlay">
          <div className="modal-content restore-modal">
            <div className="modal-header">
              <h3>⚠️ Confirm System Restore</h3>
            </div>
            <div className="modal-body">
              <div className="restore-warning">
                <p className="warning-text">
                  <strong>CRITICAL WARNING:</strong> This operation will restore the
                  system to the state captured in backup:
                </p>
                <div className="backup-details">
                  <p>
                    <strong>Backup ID:</strong> {selectedBackup.backup_id}
                  </p>
                  <p>
                    <strong>Created:</strong> {formatDate(selectedBackup.created_at)}
                  </p>
                  <p>
                    <strong>Size:</strong> {selectedBackup.backup_size_mb} MB
                  </p>
                </div>
                <p className="warning-text">
                  All current data will be replaced. This action cannot be undone.
                </p>
              </div>

              <div className="confirmation-input">
                <label>
                  Type <strong>RESTORE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={restoreConfirmation}
                  onChange={(e) => setRestoreConfirmation(e.target.value)}
                  placeholder="Type RESTORE"
                  className="restore-confirmation-input"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreConfirmation("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={restoreConfirmation !== "RESTORE" || loading}
                className="btn btn-danger"
              >
                {loading ? "Restoring..." : "Confirm Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRecovery;
