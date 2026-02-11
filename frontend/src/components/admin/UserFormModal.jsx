import React, { useEffect, useState } from "react";
import "./UserFormModal.css";

const UserFormModal = ({ isOpen, onClose, onSubmit, user, isSubmitting }) => {
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    aadhar: "",
    pan: "",
    password: "",
    verifyPassword: "",
    role: "customer",
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      // Edit mode - populate form
      setFormData({
        username: user.username || "",
        fullName: user.full_name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        address: user.address || "",
        aadhar: user.aadhar || "",
        pan: user.pan || "",
        password: "",
        verifyPassword: "",
        role: user.role || "customer",
        isActive: user.is_active !== false,
      });
    } else {
      // Add mode - reset form
      setFormData({
        username: "",
        fullName: "",
        email: "",
        mobile: "",
        address: "",
        aadhar: "",
        pan: "",
        password: "",
        verifyPassword: "",
        role: "customer",
        isActive: true,
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validate = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile must be 10 digits";
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Aadhar validation (optional)
    if (formData.aadhar && !/^\d{12}$/.test(formData.aadhar)) {
      newErrors.aadhar = "Aadhar must be 12 digits";
    }

    // PAN validation (optional)
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) {
      newErrors.pan = "Invalid PAN format (e.g., ABCDE1234F)";
    }

    // Password validation (required for new users)
    if (!user && !formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Verify password
    if (formData.password && formData.password !== formData.verifyPassword) {
      newErrors.verifyPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {user ? `Edit User - ${user.username}` : "Add New User"}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            {/* ID (read-only for edit) */}
            {user && (
              <div className="form-field full-width">
                <label className="form-label">User ID</label>
                <input
                  type="text"
                  value={user.id}
                  disabled
                  className="form-input disabled"
                />
              </div>
            )}

            {/* Username */}
            <div className="form-field">
              <label className="form-label">
                Username <span className="required">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`form-input ${errors.username ? "error" : ""}`}
                placeholder="john.doe"
                disabled={isSubmitting}
              />
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            {/* Full Name */}
            <div className="form-field">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`form-input ${errors.fullName ? "error" : ""}`}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>

            {/* Mobile */}
            <div className="form-field">
              <label className="form-label">
                Mobile Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className={`form-input ${errors.mobile ? "error" : ""}`}
                placeholder="9876543210"
                maxLength="10"
                disabled={isSubmitting}
              />
              {errors.mobile && <span className="error-text">{errors.mobile}</span>}
            </div>

            {/* Email (Optional) */}
            <div className="form-field">
              <label className="form-label">
                Email ID <span className="optional">(Optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? "error" : ""}`}
                placeholder="john@example.com"
                disabled={isSubmitting}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Address (Optional) */}
            <div className="form-field full-width">
              <label className="form-label">
                Address <span className="optional">(Optional)</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input form-textarea"
                placeholder="Enter full address"
                rows="3"
                disabled={isSubmitting}
              />
            </div>

            {/* Aadhar (Optional) */}
            <div className="form-field">
              <label className="form-label">
                Aadhar Card <span className="optional">(Optional)</span>
              </label>
              <input
                type="text"
                name="aadhar"
                value={formData.aadhar}
                onChange={handleChange}
                className={`form-input ${errors.aadhar ? "error" : ""}`}
                placeholder="123456789012"
                maxLength="12"
                disabled={isSubmitting}
              />
              {errors.aadhar && <span className="error-text">{errors.aadhar}</span>}
            </div>

            {/* PAN (Optional) */}
            <div className="form-field">
              <label className="form-label">
                PAN <span className="optional">(Optional)</span>
              </label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                className={`form-input ${errors.pan ? "error" : ""}`}
                placeholder="ABCDE1234F"
                maxLength="10"
                style={{ textTransform: "uppercase" }}
                disabled={isSubmitting}
              />
              {errors.pan && <span className="error-text">{errors.pan}</span>}
            </div>

            {/* Password */}
            <div className="form-field">
              <label className="form-label">
                Password {!user && <span className="required">*</span>}
                {user && <span className="optional">(Leave blank to keep current)</span>}
              </label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? "error" : ""}`}
                  placeholder="Enter password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  <span className="material-icons">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* Verify Password */}
            <div className="form-field">
              <label className="form-label">
                Verify Password {!user && <span className="required">*</span>}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="verifyPassword"
                value={formData.verifyPassword}
                onChange={handleChange}
                className={`form-input ${errors.verifyPassword ? "error" : ""}`}
                placeholder="Re-enter password"
                disabled={isSubmitting}
              />
              {errors.verifyPassword && <span className="error-text">{errors.verifyPassword}</span>}
            </div>

            {/* Role */}
            <div className="form-field">
              <label className="form-label">
                Role <span className="required">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
              >
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="auditor_clerk">Auditor Clerk</option>
              </select>
            </div>

            {/* Status */}
            <div className="form-field">
              <label className="form-label">Status</label>
              <div className="toggle-field">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">
                  {formData.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  {user ? "Updating..." : "Creating..."}
                </>
              ) : (
                user ? "Update User" : "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
