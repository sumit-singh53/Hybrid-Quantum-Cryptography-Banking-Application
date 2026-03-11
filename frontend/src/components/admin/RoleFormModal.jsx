import { useEffect, useState } from "react";
import "./RoleFormModal.css";

const RoleFormModal = ({ isOpen, onClose, onSubmit, role, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (role) {
      // Edit mode - populate form
      setFormData({
        name: role.name || "",
      });
    } else {
      // Add mode - reset form
      setFormData({
        name: "",
      });
    }
    setErrors({});
  }, [role, isOpen]);

  const validate = () => {
    const newErrors = {};

    // Role name validation
    if (!formData.name.trim()) {
      newErrors.name = "Role name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Role name must be at least 3 characters";
    } else if (!/^[a-zA-Z_]+$/.test(formData.name)) {
      newErrors.name = "Role name can only contain letters and underscores";
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container role-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {role ? `Edit Role - ${role.name}` : "Add New Role"}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            {/* ID (read-only for edit) */}
            {role && (
              <div className="form-field full-width">
                <label className="form-label">Role ID</label>
                <input
                  type="text"
                  value={role.id}
                  disabled
                  className="form-input disabled"
                />
              </div>
            )}

            {/* Role Name */}
            <div className="form-field full-width">
              <label className="form-label">
                Role Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="e.g., manager, auditor_clerk"
                disabled={isSubmitting || (role && role.is_system_role)}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
              {role && role.is_system_role && (
                <span className="info-text">
                  <span className="material-icons">info</span>
                  System roles cannot be renamed
                </span>
              )}
            </div>

            {/* User Count (read-only for edit) */}
            {role && (
              <div className="form-field full-width">
                <label className="form-label">Users Assigned</label>
                <input
                  type="text"
                  value={`${role.user_count} user(s)`}
                  disabled
                  className="form-input disabled"
                />
              </div>
            )}
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
              disabled={isSubmitting || (role && role.is_system_role)}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  {role ? "Updating..." : "Creating..."}
                </>
              ) : (
                role ? "Update Role" : "Create Role"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleFormModal;
