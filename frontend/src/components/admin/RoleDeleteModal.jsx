import "./RoleFormModal.css";

const RoleDeleteModal = ({ isOpen, onClose, onConfirm, role, isDeleting }) => {
  if (!isOpen || !role) return null;

  const handleConfirm = () => {
    onConfirm(role);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="material-icons text-rose-500">warning</span>
            Confirm Delete Role
          </h2>
          <button className="modal-close" onClick={onClose} disabled={isDeleting}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body">
          <div className="delete-confirmation">
            <p className="delete-warning">
              Are you sure you want to delete this role? This action cannot be undone.
            </p>

            <div className="delete-details">
              <div className="detail-row">
                <span className="detail-label">Role ID:</span>
                <span className="detail-value">#{role.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Role Name:</span>
                <span className="detail-value font-semibold">{role.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Users Assigned:</span>
                <span className="detail-value">{role.user_count} user(s)</span>
              </div>
              {role.is_system_role && (
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">
                    <span className="badge badge-system">System Role</span>
                  </span>
                </div>
              )}
            </div>

            {role.user_count > 0 && (
              <div className="alert alert-warning">
                <span className="material-icons">error</span>
                <div>
                  <strong>Warning:</strong> This role is assigned to {role.user_count} user(s).
                  You must reassign or remove these users before deleting this role.
                </div>
              </div>
            )}

            {role.is_system_role && (
              <div className="alert alert-error">
                <span className="material-icons">block</span>
                <div>
                  <strong>Cannot Delete:</strong> System roles are protected and cannot be deleted.
                </div>
              </div>
            )}
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
              onClick={handleConfirm}
              disabled={isDeleting || role.user_count > 0 || role.is_system_role}
            >
              {isDeleting ? (
                <>
                  <span className="spinner"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <span className="material-icons">delete</span>
                  Confirm Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleDeleteModal;
