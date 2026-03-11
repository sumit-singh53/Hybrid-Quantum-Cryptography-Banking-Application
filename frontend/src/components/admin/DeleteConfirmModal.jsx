import React from "react";
import "./UserFormModal.css";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, user, isDeleting }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="delete-icon">
            <span className="material-icons">warning</span>
          </div>
          <h2 className="modal-title">Confirm Delete</h2>
          <button className="modal-close" onClick={onClose} disabled={isDeleting}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body">
          <p className="delete-warning">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>

          <div className="user-details-card">
            <div className="detail-row">
              <span className="detail-label">Username:</span>
              <span className="detail-value">{user.username}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Full Name:</span>
              <span className="detail-value">{user.full_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user.email || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role:</span>
              <span className="detail-value role-badge">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onConfirm(user)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner"></span>
                Deleting...
              </>
            ) : (
              <>
                <span className="material-icons">delete</span>
                Delete User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
