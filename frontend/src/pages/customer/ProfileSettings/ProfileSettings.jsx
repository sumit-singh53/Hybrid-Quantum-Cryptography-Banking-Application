import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCustomerProfile, updateCustomerProfile } from '../../../services/customerService';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form state for editable fields
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    address: ''
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCustomerProfile();
      setProfile(data);
      setFormData({
        email: data.email || '',
        mobile: data.mobile || '',
        address: data.address || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
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
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Email validation
    if (formData.email && !formData.email.includes('@')) {
      errors.email = 'Invalid email format';
    }
    if (formData.email && formData.email.length > 150) {
      errors.email = 'Email is too long (max 150 characters)';
    }

    // Mobile validation
    if (formData.mobile && formData.mobile.length < 10) {
      errors.mobile = 'Mobile number is too short (min 10 digits)';
    }
    if (formData.mobile && formData.mobile.length > 15) {
      errors.mobile = 'Mobile number is too long (max 15 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const response = await updateCustomerProfile(formData);
      setProfile(response.profile);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors) {
        setValidationErrors(errorData.errors);
      }
      setError(errorData?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      email: profile?.email || '',
      mobile: profile?.mobile || '',
      address: profile?.address || ''
    });
    setValidationErrors({});
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="profile-settings-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-settings-container">
        <div className="error-state">
          <span className="error-icon">⚠</span>
          <p>{error || 'Profile not found'}</p>
          <button onClick={loadProfile} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-settings-container">
      <div className="profile-header">
        <p className="profile-subtitle">Manage your personal information and account details</p>
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

      <div className="profile-content">
        {/* Read-Only Information Section */}
        <div className="profile-section">
          <h2 className="section-title">Account Information</h2>
          <p className="section-subtitle">These details cannot be changed</p>

          <div className="info-grid">
            <div className="info-item">
              <label className="info-label">Customer ID</label>
              <div className="info-value readonly">{profile.user_id}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Username</label>
              <div className="info-value readonly">{profile.username}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Full Name</label>
              <div className="info-value readonly">{profile.full_name}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Role</label>
              <div className="info-value readonly">
                <span className="role-badge">{profile.role}</span>
              </div>
            </div>

            {profile.account_number && (
              <div className="info-item">
                <label className="info-label">Account Number</label>
                <div className="info-value readonly">{profile.account_number}</div>
              </div>
            )}

            {profile.account_type && (
              <div className="info-item">
                <label className="info-label">Account Type</label>
                <div className="info-value readonly">{profile.account_type}</div>
              </div>
            )}

            {profile.account_status && (
              <div className="info-item">
                <label className="info-label">Account Status</label>
                <div className="info-value readonly">
                  <span className={`status-badge ${profile.account_status.toLowerCase()}`}>
                    {profile.account_status}
                  </span>
                </div>
              </div>
            )}

            {profile.branch_code && (
              <div className="info-item">
                <label className="info-label">Branch Code</label>
                <div className="info-value readonly">{profile.branch_code}</div>
              </div>
            )}

            <div className="info-item">
              <label className="info-label">Member Since</label>
              <div className="info-value readonly">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Information Section */}
        <div className="profile-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Contact Information</h2>
              <p className="section-subtitle">You can update these details</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="edit-button">
                <span className="edit-icon">✎</span>
                Edit
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Email Address
                {isEditing && <span className="optional-badge">Optional</span>}
              </label>
              {isEditing ? (
                <>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`form-input ${validationErrors.email ? 'error' : ''}`}
                    placeholder="your.email@example.com"
                  />
                  {validationErrors.email && (
                    <span className="error-text">{validationErrors.email}</span>
                  )}
                </>
              ) : (
                <div className="info-value">{profile.email || 'Not provided'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Mobile Number
                {isEditing && <span className="required-badge">Required</span>}
              </label>
              {isEditing ? (
                <>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className={`form-input ${validationErrors.mobile ? 'error' : ''}`}
                    placeholder="+91 98765 43210"
                  />
                  {validationErrors.mobile && (
                    <span className="error-text">{validationErrors.mobile}</span>
                  )}
                </>
              ) : (
                <div className="info-value">{profile.mobile || 'Not provided'}</div>
              )}
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                Address
                {isEditing && <span className="optional-badge">Optional</span>}
              </label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Enter your full address"
                  rows="3"
                />
              ) : (
                <div className="info-value">{profile.address || 'Not provided'}</div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button onClick={handleCancel} className="cancel-button" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSave} className="save-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Security Actions Section */}
        <div className="profile-section">
          <h2 className="section-title">Security</h2>
          <p className="section-subtitle">Manage your account security settings</p>

          <div className="security-actions">
            <Link to="/customer/security" className="security-action-card">
              <div className="action-icon">🔒</div>
              <div className="action-content">
                <h3 className="action-title">Security Center</h3>
                <p className="action-description">View security status and manage sessions</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
