import { useState, useEffect } from 'react';
import { createCertificateRequest, getMyCertificateRequests, getMyCertificateInfo, enrollApprovedCertificate } from '../../../services/customerService';
import './CertificateRequest.css';

const CertificateRequest = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Certificate info
  const [certificateInfo, setCertificateInfo] = useState(null);
  const [hasCertificate, setHasCertificate] = useState(false);
  
  // Requests history
  const [requests, setRequests] = useState([]);
  
  // Form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'RENEWAL',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load certificate info
      const certResponse = await getMyCertificateInfo();
      setHasCertificate(certResponse.has_certificate);
      if (certResponse.has_certificate) {
        setCertificateInfo(certResponse.certificate);
      }
      
      // Load requests history
      const requestsResponse = await getMyCertificateRequests();
      setRequests(requestsResponse.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.reason || formData.reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await createCertificateRequest(formData);
      setSuccess('Certificate request submitted successfully! Admin will review it.');
      setFormData({ request_type: 'RENEWAL', reason: '' });
      setShowRequestForm(false);
      
      // Reload requests
      await loadData();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCertificate = (userId) => {
    // Download certificate
    const downloadUrl = `http://localhost:5001/api/customer/download-certificate/${userId}`;
    window.open(downloadUrl, '_blank');
  };

  const extractDeviceSecret = (adminNotes) => {
    if (!adminNotes) return null;
    const match = adminNotes.match(/Device Secret:\s*([^\s\n]+)/);
    return match ? match[1] : null;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Device secret copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(''), 3000);
    });
  };

  const handleReEnroll = async (request) => {
    setError('');
    setSuccess('');
    setEnrolling(true);

    try {
      // Check if already used
      if (request.admin_notes && request.admin_notes.includes('Certificate issued on re-enrollment')) {
        setError('This certificate request has already been used for re-enrollment. Please create a new request.');
        setEnrolling(false);
        return;
      }

      // Generate new keypairs
      console.log('[RE-ENROLL] Generating new keypairs...');
      
      // Generate RSA keypair
      const rsaKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-PSS',
          modulusLength: 3072,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['sign', 'verify']
      );

      // Generate ML-KEM (Kyber) keypair - using placeholder for now
      // In production, use actual Kyber implementation
      const kyberPublicKey = btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(1184))));

      // Export RSA public key
      const rsaPublicKey = await window.crypto.subtle.exportKey('spki', rsaKeyPair.publicKey);
      const rsaPublicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(rsaPublicKey)));

      console.log('[RE-ENROLL] Keys generated, calling backend...');

      // Call backend to issue certificate with new keys
      const response = await enrollApprovedCertificate(request.user_id, {
        rsa_spki: rsaPublicKeyB64,
        ml_kem_public_key: kyberPublicKey,
        pq_public_key: null // Optional
      });

      console.log('[RE-ENROLL] Certificate issued:', response);

      // Store private keys in IndexedDB
      const dbRequest = indexedDB.open('PQBankingKeyStore', 1);
      
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };

      dbRequest.onsuccess = async (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');

        // Export and store RSA private key
        const rsaPrivateKey = await window.crypto.subtle.exportKey('pkcs8', rsaKeyPair.privateKey);
        const rsaPrivateKeyB64 = btoa(String.fromCharCode(...new Uint8Array(rsaPrivateKey)));
        
        store.put(rsaPrivateKeyB64, 'rsa_private_key');
        store.put(response.device_secret, 'device_secret');
        store.put(response.certificate_pem, 'certificate');

        console.log('[RE-ENROLL] Keys stored in IndexedDB');

        // Download certificate file
        const certBlob = new Blob([response.certificate_pem], { type: 'application/x-pem-file' });
        const certUrl = window.URL.createObjectURL(certBlob);
        const certLink = document.createElement('a');
        certLink.href = certUrl;
        certLink.download = `certificate_${request.user_id}.pem`;
        document.body.appendChild(certLink);
        certLink.click();
        document.body.removeChild(certLink);
        window.URL.revokeObjectURL(certUrl);

        // Download RSA private key file
        const rsaPrivateKeyPem = `-----BEGIN PRIVATE KEY-----\n${rsaPrivateKeyB64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
        const keyBlob = new Blob([rsaPrivateKeyPem], { type: 'application/x-pem-file' });
        const keyUrl = window.URL.createObjectURL(keyBlob);
        const keyLink = document.createElement('a');
        keyLink.href = keyUrl;
        keyLink.download = `rsa_private_${request.user_id}.pem`;
        document.body.appendChild(keyLink);
        keyLink.click();
        document.body.removeChild(keyLink);
        window.URL.revokeObjectURL(keyUrl);

        setSuccess(`✅ Certificate enrolled successfully! 
        
IMPORTANT - Save these files:
1. Certificate: certificate_${request.user_id}.pem
2. Private Key: rsa_private_${request.user_id}.pem  
3. Device Secret: ${response.device_secret}

Logging out in 10 seconds...`);
        
        // Reload requests to show updated status
        await loadData();
        
        // Auto-logout after 10 seconds (increased from 5)
        setTimeout(() => {
          // Clear auth token
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          
          // Redirect to login
          window.location.href = '/login';
        }, 10000);
      };

      dbRequest.onerror = () => {
        setError('Failed to store keys in browser');
      };

    } catch (err) {
      console.error('[RE-ENROLL] Error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to re-enroll certificate';
      setError(errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'EXPIRED': return 'status-expired';
      case 'REVOKED': return 'status-revoked';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="certificate-request-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading certificate information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-request-container">
      <div className="page-header">
        <h1 className="page-title">Certificate Management</h1>
        <p className="page-subtitle">View your certificate status and request new certificates</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {success}
        </div>
      )}

      {/* Current Certificate Section */}
      <div className="cert-section">
        <h2 className="section-title">Current Certificate</h2>
        
        {hasCertificate && certificateInfo ? (
          <div className="cert-info-card">
            <div className="cert-status-header">
              <span className={`cert-status-badge ${getStatusColor(certificateInfo.status)}`}>
                {certificateInfo.status}
              </span>
              <span className="cert-id">ID: {certificateInfo.certificate_id}</span>
            </div>

            <div className="cert-details-grid">
              <div className="cert-detail">
                <label>Owner</label>
                <span>{certificateInfo.owner}</span>
              </div>
              <div className="cert-detail">
                <label>Role</label>
                <span className="role-badge">{certificateInfo.role}</span>
              </div>
              <div className="cert-detail">
                <label>Issued At</label>
                <span>{new Date(certificateInfo.issued_at).toLocaleString('en-IN')}</span>
              </div>
              <div className="cert-detail">
                <label>Valid From</label>
                <span>{new Date(certificateInfo.valid_from).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="cert-detail">
                <label>Valid To</label>
                <span>{new Date(certificateInfo.valid_to).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="cert-detail">
                <label>Generation</label>
                <span>{certificateInfo.cert_generation}</span>
              </div>
            </div>

            {certificateInfo.allowed_actions && certificateInfo.allowed_actions.length > 0 && (
              <div className="cert-permissions">
                <label>Allowed Actions:</label>
                <div className="permissions-list">
                  {certificateInfo.allowed_actions.map((action, index) => (
                    <span key={index} className="permission-badge">{action}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-cert-card">
            <div className="no-cert-icon">🔒</div>
            <h3>No Active Certificate</h3>
            <p>You don't have an active certificate. Request one below.</p>
          </div>
        )}
      </div>

      {/* Request New Certificate Section */}
      <div className="cert-section">
        <div className="section-header">
          <h2 className="section-title">Request Certificate</h2>
          {!showRequestForm && (
            <button onClick={() => setShowRequestForm(true)} className="request-button">
              <span className="button-icon">+</span>
              New Request
            </button>
          )}
        </div>

        {showRequestForm && (
          <form onSubmit={handleSubmitRequest} className="request-form">
            <div className="form-group">
              <label className="form-label">Request Type</label>
              <select
                name="request_type"
                value={formData.request_type}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="NEW">New Certificate</option>
                <option value="RENEWAL">Renewal</option>
              </select>
              <p className="form-hint">
                {formData.request_type === 'NEW' 
                  ? 'Request a completely new certificate' 
                  : 'Renew your existing certificate'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Request *</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Please provide a detailed reason for your certificate request (minimum 10 characters)"
                rows="4"
                required
                minLength="10"
              />
              <p className="form-hint">
                {formData.reason.length}/10 characters minimum
              </p>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowRequestForm(false);
                  setFormData({ request_type: 'RENEWAL', reason: '' });
                  setError('');
                }}
                className="cancel-button"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={submitting || formData.reason.length < 10}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            <div className="form-note">
              <span className="note-icon">ℹ</span>
              <p>Your request will be reviewed by an administrator. You will be notified once it's processed.</p>
            </div>
          </form>
        )}
      </div>

      {/* Request History Section */}
      <div className="cert-section">
        <h2 className="section-title">Request History</h2>
        
        {requests.length > 0 ? (
          <div className="requests-list">
            {requests.map((req) => (
              <div key={req.id} className="request-card">
                <div className="request-header">
                  <span className={`request-status ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                  <span className="request-date">
                    {new Date(req.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                
                <div className="request-body">
                  <div className="request-info">
                    <label>Type:</label>
                    <span>{req.request_type}</span>
                  </div>
                  <div className="request-info">
                    <label>Reason:</label>
                    <p>{req.reason}</p>
                  </div>
                  
                  {req.status !== 'PENDING' && req.reviewed_by && (
                    <div className="request-review">
                      <div className="review-info">
                        <label>Reviewed By:</label>
                        <span>{req.reviewed_by}</span>
                      </div>
                      {req.reviewed_at && (
                        <div className="review-info">
                          <label>Reviewed At:</label>
                          <span>{new Date(req.reviewed_at).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {req.admin_notes && (
                        <div className="review-info">
                          <label>Admin Notes:</label>
                          <p>{req.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {req.status === 'APPROVED' && (
                    <div className="request-actions">
                      {req.admin_notes && req.admin_notes.includes('Certificate issued on re-enrollment') ? (
                        <div className="reenroll-section">
                          <h4>✅ Certificate Already Generated</h4>
                          <p>This request has already been used to generate a certificate. If you need a new certificate, please create a new request.</p>
                        </div>
                      ) : (
                        <>
                          <div className="reenroll-section">
                            <h4>🎉 Your certificate request has been approved!</h4>
                            <p>Click the button below to generate your new certificate with fresh cryptographic keys.</p>
                            <button
                              onClick={() => handleReEnroll(req)}
                              className="reenroll-button"
                              disabled={enrolling}
                            >
                              {enrolling ? '🔄 Generating Certificate...' : '🔑 Re-enroll & Generate Certificate'}
                            </button>
                          </div>
                          <div className="reenroll-instructions">
                            <h4>After re-enrollment:</h4>
                            <ol>
                              <li>Your new certificate will be downloaded automatically</li>
                              <li>Your device secret will be displayed (save it securely!)</li>
                              <li>Logout from your current session</li>
                              <li>Login again - your browser will use the new certificate automatically</li>
                            </ol>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">
            <p>No certificate requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateRequest;
