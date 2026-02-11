import React, { useEffect, useState } from "react";
import { fetchEncryptionStatus } from "../../../services/managerService";
import "./EncryptionStatus.css";

const EncryptionStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to safely format dates
  const formatDate = (dateValue) => {
    if (!dateValue) return "Not available";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "Not available";
      return date.toLocaleString();
    } catch (e) {
      return "Not available";
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchEncryptionStatus();
      setStatus(data || {});
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load encryption status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatusClass = (healthStatus) => {
    switch (healthStatus?.toLowerCase()) {
      case "active":
        return "status-active";
      case "warning":
        return "status-warning";
      case "critical":
        return "status-critical";
      default:
        return "status-unknown";
    }
  };

  const getHealthIcon = (healthStatus) => {
    switch (healthStatus?.toLowerCase()) {
      case "active":
        return (
          <svg className="icon-status" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="icon-status" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "critical":
        return (
          <svg className="icon-status" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="icon-status" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading && !status) {
    return (
      <div className="encryption-status-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading encryption status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="encryption-status-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-subtitle">
            High-level encryption overview (Read-Only)
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

      {status && (
        <>
          {/* Overall Health Status */}
          <div className={`health-card ${getHealthStatusClass(status.encryption_module_status)}`}>
            <div className="health-icon">
              {getHealthIcon(status.encryption_module_status)}
            </div>
            <div className="health-content">
              <h2>Encryption Module Status</h2>
              <div className="health-status">{status.encryption_module_status}</div>
              <p className="health-timestamp">
                Last verified: {formatDate(status.last_verification)}
              </p>
            </div>
          </div>

          {/* Encryption Overview Grid */}
          <div className="encryption-grid">
            {/* Data at Rest */}
            <div className="encryption-card">
              <div className="card-header">
                <svg className="icon-card" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <h3>Data at Rest Encryption</h3>
              </div>
              <div className="card-body">
                <div className={`status-badge ${status.data_at_rest_encryption === "Enabled" ? "badge-enabled" : "badge-disabled"}`}>
                  {status.data_at_rest_encryption}
                </div>
                <p className="card-description">
                  Database and file system encryption protecting stored data
                </p>
              </div>
            </div>

            {/* Data in Transit */}
            <div className="encryption-card">
              <div className="card-header">
                <svg className="icon-card" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3>Data in Transit Encryption</h3>
              </div>
              <div className="card-body">
                <div className={`status-badge ${status.data_in_transit_encryption === "Enabled" ? "badge-enabled" : "badge-disabled"}`}>
                  {status.data_in_transit_encryption}
                </div>
                <p className="card-description">
                  TLS/HTTPS encryption protecting data during transmission
                </p>
              </div>
            </div>

            {/* Classical Cryptography */}
            <div className="encryption-card">
              <div className="card-header">
                <svg className="icon-card" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h3>Classical Cryptography</h3>
              </div>
              <div className="card-body">
                <div className={`status-badge ${status.classical_crypto_active ? "badge-active" : "badge-inactive"}`}>
                  {status.classical_crypto_active ? "Active" : "Inactive"}
                </div>
                <p className="card-description">
                  {status.encryption_algorithms?.classical || "AES/RSA encryption"}
                </p>
              </div>
            </div>

            {/* Post-Quantum Cryptography */}
            <div className="encryption-card">
              <div className="card-header">
                <svg className="icon-card" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3>Post-Quantum Cryptography</h3>
              </div>
              <div className="card-body">
                <div className={`status-badge ${status.pqc_active ? "badge-active" : "badge-inactive"}`}>
                  {status.pqc_active ? "Active" : "Inactive"}
                </div>
                <p className="card-description">
                  {status.encryption_algorithms?.post_quantum || "ML-KEM/ML-DSA encryption"}
                </p>
              </div>
            </div>
          </div>

          {/* Information Panel */}
          <div className="info-panel">
            <div className="info-header">
              <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Encryption Information</h3>
            </div>
            <div className="info-content">
              <div className="info-item">
                <strong>Hybrid Encryption:</strong>
                <p>
                  This system uses a hybrid approach combining classical cryptography (AES-256, RSA-3072) 
                  with post-quantum algorithms (ML-KEM-768, ML-DSA-65) to ensure security against both 
                  current and future quantum computing threats.
                </p>
              </div>
              <div className="info-item">
                <strong>Data Protection:</strong>
                <p>
                  All sensitive data is encrypted at rest using AES-256-GCM. Communications are secured 
                  with TLS 1.3. Certificate-based authentication uses hybrid signatures for quantum resistance.
                </p>
              </div>
              <div className="info-item">
                <strong>Manager Access:</strong>
                <p>
                  As a Manager, you can view encryption status but cannot modify encryption settings, 
                  access cryptographic keys, or change security configurations. These operations require 
                  System Administrator privileges.
                </p>
              </div>
            </div>
          </div>

          {/* Read-Only Notice */}
          <div className="read-only-notice">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <strong>Read-Only Access</strong>
              <p>Managers cannot enable/disable encryption, access keys, or modify cryptographic configurations</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EncryptionStatus;
