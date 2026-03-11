import { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import RoleFormModal from "../../../components/admin/RoleFormModal";
import RoleDeleteModal from "../../../components/admin/RoleDeleteModal";
import "./SystemAdminRoleManagement.css";

const SystemAdminRoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roleBanner, setRoleBanner] = useState("");
  const [search, setSearch] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;

    return roles.filter((role) => {
      const name = (role.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [roles, search]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const payload = await systemAdminService.listRoles();
      // Sort roles by ID in ascending order
      const sortedRoles = (payload?.roles || []).sort((a, b) => a.id - b.id);
      setRoles(sortedRoles);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setRolesError(message || "Unable to load roles");
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Handle Add Role
  const handleAddRole = () => {
    setSelectedRole(null);
    setRolesError("");
    setRoleBanner("");
    setShowAddModal(true);
  };

  // Handle Edit Role
  const handleEditRole = (role) => {
    setSelectedRole(role);
    setRolesError("");
    setRoleBanner("");
    setShowEditModal(true);
  };

  // Handle Delete Role
  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setRolesError("");
    setRoleBanner("");
    setShowDeleteModal(true);
  };

  // Submit Add/Edit
  const handleSubmitRole = async (formData) => {
    setRolesError("");
    setRoleBanner("");

    const payload = {
      name: formData.name.trim(),
    };

    setRoleSubmitting(true);
    try {
      if (selectedRole) {
        // Update existing role
        await systemAdminService.updateRole(selectedRole.id, payload);
        setRoleBanner(`Updated role "${payload.name}" successfully`);
        setShowEditModal(false);
      } else {
        // Create new role
        await systemAdminService.createRole(payload);
        setRoleBanner(`Created role "${payload.name}" successfully`);
        setShowAddModal(false);
      }
      setSelectedRole(null);
      await loadRoles();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setRolesError(message || "Unable to save role");
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (role) => {
    if (!role || !role.id) return;

    setRolesError("");
    setRoleBanner("");
    setRoleSubmitting(true);

    try {
      await systemAdminService.deleteRole(role.id);
      setRoleBanner(`Deleted role "${role.name}" successfully`);
      setShowDeleteModal(false);
      setSelectedRole(null);
      await loadRoles();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setRolesError(message || "Unable to delete role");
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Close modals
  const closeModals = () => {
    if (!roleSubmitting) {
      setShowAddModal(false);
      setShowEditModal(false);
      setShowDeleteModal(false);
      setSelectedRole(null);
    }
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage system roles and access levels
            </p>
          </div>
          <button
            onClick={handleAddRole}
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold transition border-indigo-400/40 bg-indigo-500/10 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-500/20 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:border-indigo-200 dark:hover:bg-indigo-500/20"
          >
            <span className="material-icons text-lg">add</span>
            Add New Role
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search roles by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border pl-12 pr-4 py-2.5 text-sm transition placeholder:text-slate-500 focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Messages */}
        {(rolesError || roleBanner) && (
          <div className="mt-4 space-y-2">
            {rolesError && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-lg">error</span>
                  {rolesError}
                </div>
              </div>
            )}
            {roleBanner && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-lg">check_circle</span>
                  {roleBanner}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Roles Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Users Assigned</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rolesLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="spinner"></div>
                      Loading roles...
                    </div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {search ? "No roles match your search." : "No roles found."}
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      #{role.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {role.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {role.is_system_role ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <span className="material-icons text-xs mr-1">shield</span>
                          System
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-sm text-slate-400">group</span>
                        {role.user_count} user(s)
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRole(role)}
                          disabled={role.is_system_role}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={role.is_system_role ? "System roles cannot be edited" : "Edit role"}
                        >
                          <span className="material-icons text-sm">edit</span>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role)}
                          disabled={role.is_system_role || role.user_count > 0}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            role.is_system_role 
                              ? "System roles cannot be deleted" 
                              : role.user_count > 0 
                              ? "Cannot delete role with assigned users" 
                              : "Delete role"
                          }
                        >
                          <span className="material-icons text-sm">delete</span>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Section */}
        <div className="mt-6 rounded-2xl border p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30">
          <div className="flex items-start gap-3">
            <span className="material-icons text-blue-600 dark:text-blue-400">info</span>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Role Management Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>System roles (customer, manager, auditor_clerk, system_admin) cannot be modified or deleted</li>
                <li>Custom roles can be created for specific organizational needs</li>
                <li>Roles with assigned users cannot be deleted - reassign users first</li>
                <li>Role names should be descriptive and follow naming conventions (lowercase, underscores)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      <RoleFormModal
        isOpen={showAddModal}
        onClose={closeModals}
        onSubmit={handleSubmitRole}
        role={null}
        isSubmitting={roleSubmitting}
      />

      {/* Edit Role Modal */}
      <RoleFormModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleSubmitRole}
        role={selectedRole}
        isSubmitting={roleSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <RoleDeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        role={selectedRole}
        isDeleting={roleSubmitting}
      />
    </section>
  );
};

export default SystemAdminRoleManagement;
