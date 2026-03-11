/**
 * RBAC Management Page - Professional Redesign
 * System admin interface for managing roles and permissions
 */
import { useState, useEffect } from "react";
import PermissionGate from "../../../components/common/PermissionGate";
import RoleFormModal from "../../../components/admin/RoleFormModal";
import RoleDeleteModal from "../../../components/admin/RoleDeleteModal";
import systemAdminService from "../../../services/systemAdminService";
import {
  getAllRoles,
  getAllPermissions,
  getRoleDetails,
  addPermissionToRole,
  removePermissionFromRole,
  initializeRBAC,
} from "../../../services/rbacService";
import "./RBACManagement.css";

const RBACManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleDetails, setRoleDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchRole, setSearchRole] = useState("");
  const [searchPermission, setSearchPermission] = useState("");

  // Role CRUD modal states
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesData, permissionsData] = await Promise.all([
        getAllRoles(),
        getAllPermissions(),
      ]);

      // Sort roles by ID
      const sortedRoles = (rolesData.roles || []).sort((a, b) => a.id - b.id);
      setRoles(sortedRoles);
      setPermissions(permissionsData.permissions || []);
    } catch (err) {
      setError(err.message || "Failed to load RBAC data");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (roleName) => {
    try {
      setSelectedRole(roleName);
      const details = await getRoleDetails(roleName);
      setRoleDetails(details);
      setError(null);
    } catch (err) {
      setError(`Failed to load role details: ${err.message}`);
    }
  };

  const handleAddPermission = async (permissionName) => {
    if (!selectedRole) return;

    try {
      await addPermissionToRole(selectedRole, permissionName);
      setSuccessMessage(
        `Added permission "${permissionName}" to role "${selectedRole}"`
      );
      setError(null);
      await handleRoleSelect(selectedRole);
      await loadData();
    } catch (err) {
      setError(`Failed to add permission: ${err.message}`);
      setSuccessMessage(null);
    }
  };

  const handleRemovePermission = async (permissionName) => {
    if (!selectedRole) return;

    if (
      !window.confirm(
        `Remove permission "${permissionName}" from role "${selectedRole}"?`
      )
    ) {
      return;
    }

    try {
      await removePermissionFromRole(selectedRole, permissionName);
      setSuccessMessage(
        `Removed permission "${permissionName}" from role "${selectedRole}"`
      );
      setError(null);
      await handleRoleSelect(selectedRole);
      await loadData();
    } catch (err) {
      setError(`Failed to remove permission: ${err.message}`);
      setSuccessMessage(null);
    }
  };

  const handleInitializeRBAC = async () => {
    if (
      !window.confirm(
        "Initialize RBAC system? This will reset all role-permission mappings to defaults."
      )
    ) {
      return;
    }

    try {
      const result = await initializeRBAC();
      setSuccessMessage(result.status);
      setError(null);
      await loadData();
    } catch (err) {
      setError(`Failed to initialize RBAC: ${err.message}`);
      setSuccessMessage(null);
    }
  };

  // Role CRUD handlers
  const handleAddRole = () => {
    setSelectedRoleForEdit(null);
    setError(null);
    setSuccessMessage(null);
    setShowAddRoleModal(true);
  };

  const handleEditRole = (role) => {
    setSelectedRoleForEdit(role);
    setError(null);
    setSuccessMessage(null);
    setShowEditRoleModal(true);
  };

  const handleDeleteRole = (role) => {
    setSelectedRoleForEdit(role);
    setError(null);
    setSuccessMessage(null);
    setShowDeleteRoleModal(true);
  };

  const handleSubmitRole = async (formData) => {
    setError(null);
    setSuccessMessage(null);

    const payload = {
      name: formData.name.trim(),
    };

    setRoleSubmitting(true);
    try {
      if (selectedRoleForEdit) {
        await systemAdminService.updateRole(selectedRoleForEdit.id, payload);
        setSuccessMessage(`Updated role "${payload.name}" successfully`);
        setShowEditRoleModal(false);
      } else {
        await systemAdminService.createRole(payload);
        setSuccessMessage(`Created role "${payload.name}" successfully`);
        setShowAddRoleModal(false);
      }
      setSelectedRoleForEdit(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to save role");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleConfirmDeleteRole = async (role) => {
    if (!role || !role.id) return;

    setError(null);
    setSuccessMessage(null);
    setRoleSubmitting(true);

    try {
      await systemAdminService.deleteRole(role.id);
      setSuccessMessage(`Deleted role "${role.name}" successfully`);
      setShowDeleteRoleModal(false);
      setSelectedRoleForEdit(null);
      
      if (selectedRole === role.name) {
        setSelectedRole(null);
        setRoleDetails(null);
      }
      
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to delete role");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const closeRoleModals = () => {
    if (!roleSubmitting) {
      setShowAddRoleModal(false);
      setShowEditRoleModal(false);
      setShowDeleteRoleModal(false);
      setSelectedRoleForEdit(null);
    }
  };

  const getRolePermissionIds = () => {
    if (!roleDetails || !roleDetails.permissions) return new Set();
    return new Set(roleDetails.permissions.map((p) => p.id));
  };

  const groupPermissionsByResource = () => {
    const grouped = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchRole.toLowerCase())
  );

  if (loading) {
    return (
      <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="spinner"></div>
            <span className="text-slate-600 dark:text-slate-400">Loading RBAC configuration...</span>
          </div>
        </div>
      </section>
    );
  }

  const rolePermissionIds = getRolePermissionIds();
  const groupedPermissions = groupPermissionsByResource();

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Access Control & RBAC : Terminate All Certificate
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage roles, permissions, and access control policies
            </p>
          </div>
          <PermissionGate permissions="manage_permissions">
            <button
              onClick={handleInitializeRBAC}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold transition border-amber-400/40 bg-amber-500/10 text-amber-700 hover:border-amber-500 hover:bg-amber-500/20 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:border-amber-200 dark:hover:bg-amber-500/20"
              title="Reset RBAC to default configuration"
            >
              <span className="material-icons text-lg">refresh</span>
              Initialize RBAC
            </button>
          </PermissionGate>
        </div>

        {/* Messages */}
        {(error || successMessage) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-lg">error</span>
                    {error}
                  </div>
                  <button onClick={() => setError(null)} className="material-icons text-lg hover:opacity-70">
                    close
                  </button>
                </div>
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-lg">check_circle</span>
                    {successMessage}
                  </div>
                  <button onClick={() => setSuccessMessage(null)} className="material-icons text-lg hover:opacity-70">
                    close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles Panel */}
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Roles ({filteredRoles.length})
            </h3>
            <PermissionGate permissions="manage_permissions">
              <button
                onClick={handleAddRole}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition border-indigo-400/40 bg-indigo-500/10 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-500/20 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:border-indigo-200 dark:hover:bg-indigo-500/20"
              >
                <span className="material-icons text-sm">add</span>
                Add
              </button>
            </PermissionGate>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search roles..."
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                className="w-full rounded-xl border pl-9 pr-3 py-2 text-sm transition placeholder:text-slate-500 focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* Roles List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className={`rounded-xl border p-3 transition cursor-pointer ${
                  selectedRole === role.name
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <div onClick={() => handleRoleSelect(role.name)}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 capitalize">
                      {role.name}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Level {role.hierarchy_level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {role.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span className="material-icons text-xs">security</span>
                    {role.permission_count} permissions
                  </div>
                </div>
                
                <PermissionGate permissions="manage_permissions">
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRole(role);
                      }}
                      disabled={role.is_system_role}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={role.is_system_role ? "System roles cannot be edited" : "Edit role"}
                    >
                      <span className="material-icons text-xs">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role);
                      }}
                      disabled={role.is_system_role || role.user_count > 0}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        role.is_system_role 
                          ? "System roles cannot be deleted" 
                          : role.user_count > 0 
                          ? "Cannot delete role with assigned users" 
                          : "Delete role"
                      }
                    >
                      <span className="material-icons text-xs">delete</span>
                      Delete
                    </button>
                  </div>
                </PermissionGate>
              </div>
            ))}
          </div>
        </div>

        {/* Role Details Panel - Continued in next message due to length */}
        <div className="lg:col-span-2 rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          {roleDetails ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {roleDetails.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {roleDetails.description}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Level {roleDetails.hierarchy_level}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Assigned Permissions ({roleDetails.permissions.length})
              </h4>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {roleDetails.permissions.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No permissions assigned to this role
                  </p>
                ) : (
                  roleDetails.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-icons text-sm text-emerald-600 dark:text-emerald-400">
                            check_circle
                          </span>
                          <strong className="text-sm text-slate-900 dark:text-slate-100">
                            {perm.name}
                          </strong>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 ml-6">
                          {perm.resource} • {perm.action}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 ml-6 mt-1">
                          {perm.description}
                        </p>
                      </div>
                      <PermissionGate permissions="manage_permissions">
                        <button
                          onClick={() => handleRemovePermission(perm.name)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                          title="Remove permission"
                        >
                          <span className="material-icons text-xs">remove</span>
                          Remove
                        </button>
                      </PermissionGate>
                    </div>
                  ))
                )}
              </div>

              {/* Available Permissions */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Available Permissions
                  </h4>
                  <div className="relative">
                    <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchPermission}
                      onChange={(e) => setSearchPermission(e.target.value)}
                      className="w-48 rounded-lg border pl-7 pr-2 py-1 text-xs transition placeholder:text-slate-500 focus:outline-none focus:ring-1 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => {
                    const filteredPerms = perms.filter(perm =>
                      perm.name.toLowerCase().includes(searchPermission.toLowerCase()) ||
                      perm.resource.toLowerCase().includes(searchPermission.toLowerCase())
                    );
                    
                    if (filteredPerms.length === 0) return null;
                    
                    return (
                      <div key={resource} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-2">
                          {resource}
                        </h5>
                        <div className="space-y-2">
                          {filteredPerms.map((perm) => {
                            const isAssigned = rolePermissionIds.has(perm.id);
                            return (
                              <div
                                key={perm.id}
                                className={`flex items-start justify-between gap-3 p-2 rounded-lg ${
                                  isAssigned
                                    ? "bg-slate-100 dark:bg-slate-900/30 opacity-60"
                                    : "bg-white dark:bg-slate-950/30"
                                }`}
                              >
                                <div className="flex-1">
                                  <strong className="text-xs text-slate-900 dark:text-slate-100">
                                    {perm.name}
                                  </strong>
                                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                    {perm.description}
                                  </p>
                                </div>
                                <PermissionGate permissions="manage_permissions">
                                  {isAssigned ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                      Assigned
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAddPermission(perm.name)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                                      title="Add to selected role"
                                    >
                                      <span className="material-icons text-xs">add</span>
                                      Add
                                    </button>
                                  )}
                                </PermissionGate>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-icons text-6xl text-slate-300 dark:text-slate-700 mb-4">
                security
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Select a Role
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a role from the list to view and manage its permissions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Principles */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Security Principles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons text-blue-600 dark:text-blue-400">shield</span>
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                Least Privilege
              </h4>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Users granted only minimum necessary permissions
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons text-purple-600 dark:text-purple-400">group_work</span>
              <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                Separation of Duties
              </h4>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Critical operations require specific roles
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons text-emerald-600 dark:text-emerald-400">layers</span>
              <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                Defense in Depth
              </h4>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Multiple layers of access control
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons text-amber-600 dark:text-amber-400">lock</span>
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Fail-Safe Defaults
              </h4>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Access denied by default
            </p>
          </div>
        </div>
      </div>

      {/* Role CRUD Modals */}
      <RoleFormModal
        isOpen={showAddRoleModal}
        onClose={closeRoleModals}
        onSubmit={handleSubmitRole}
        role={null}
        isSubmitting={roleSubmitting}
      />

      <RoleFormModal
        isOpen={showEditRoleModal}
        onClose={closeRoleModals}
        onSubmit={handleSubmitRole}
        role={selectedRoleForEdit}
        isSubmitting={roleSubmitting}
      />

      <RoleDeleteModal
        isOpen={showDeleteRoleModal}
        onClose={closeRoleModals}
        onConfirm={handleConfirmDeleteRole}
        role={selectedRoleForEdit}
        isDeleting={roleSubmitting}
      />
    </section>
  );
};

export default RBACManagement;