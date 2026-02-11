import React, { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import UserFormModal from "../../../components/admin/UserFormModal";
import DeleteConfirmModal from "../../../components/admin/DeleteConfirmModal";
import "./SystemAdminUserInventory.css";

const SystemAdminUserInventory = () => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [userBanner, setUserBanner] = useState("");
  const [search, setSearch] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSubmitting, setUserSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const username = (user.username || "").toLowerCase();
      const fullName = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const mobile = (user.mobile || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      return username.includes(query) || fullName.includes(query) || 
             email.includes(query) || mobile.includes(query) || role.includes(query);
    });
  }, [users, search]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const payload = await systemAdminService.listUsers();
      setUsers(payload?.users || []);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Add User
  const handleAddUser = () => {
    setSelectedUser(null);
    setUsersError("");
    setUserBanner("");
    setShowAddModal(true);
  };

  // Handle Edit User
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUsersError("");
    setUserBanner("");
    setShowEditModal(true);
  };

  // Handle Delete User
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setUsersError("");
    setUserBanner("");
    setShowDeleteModal(true);
  };

  // Submit Add/Edit
  const handleSubmitUser = async (formData) => {
    setUsersError("");
    setUserBanner("");

    const payload = {
      username: formData.username.trim(),
      full_name: formData.fullName.trim(),
      email: formData.email.trim() || null,
      mobile: formData.mobile.trim(),
      address: formData.address.trim() || null,
      aadhar: formData.aadhar.trim() || null,
      pan: formData.pan.trim().toUpperCase() || null,
      role: formData.role,
      is_active: formData.isActive,
    };

    // Add password only if provided
    if (formData.password) {
      payload.password = formData.password;
    }

    setUserSubmitting(true);
    try {
      if (selectedUser) {
        // Update existing user
        await systemAdminService.updateUser(selectedUser.id, payload);
        setUserBanner(`Updated user "${payload.username}" successfully`);
        setShowEditModal(false);
      } else {
        // Create new user
        await systemAdminService.createUser(payload);
        setUserBanner(`Created user "${payload.username}" successfully`);
        setShowAddModal(false);
      }
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to save user");
    } finally {
      setUserSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (user) => {
    if (!user || !user.id) return;

    setUsersError("");
    setUserBanner("");
    setUserSubmitting(true);

    try {
      await systemAdminService.deleteUser(user.id);
      setUserBanner(`Deleted user "${user.username}" successfully`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to delete user");
    } finally {
      setUserSubmitting(false);
    }
  };

  // Close modals
  const closeModals = () => {
    if (!userSubmitting) {
      setShowAddModal(false);
      setShowEditModal(false);
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage system users and their roles
            </p>
          </div>
          <button
            onClick={handleAddUser}
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold transition border-indigo-400/40 bg-indigo-500/10 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-500/20 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:border-indigo-200 dark:hover:bg-indigo-500/20"
          >
            <span className="material-icons text-lg">add</span>
            Add New User
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
              placeholder="Search by username, name, email, mobile, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border pl-12 pr-4 py-2.5 text-sm transition placeholder:text-slate-500 focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Messages */}
        {(usersError || userBanner) && (
          <div className="mt-4 space-y-2">
            {usersError && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-lg">error</span>
                  {usersError}
                </div>
              </div>
            )}
            {userBanner && (
              <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-lg">check_circle</span>
                  {userBanner}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {usersLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="spinner"></div>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      #{user.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {user.full_name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {user.email || <span className="text-slate-400 dark:text-slate-500">N/A</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {user.mobile || <span className="text-slate-400 dark:text-slate-500">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
                        >
                          <span className="material-icons text-sm">edit</span>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
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
      </div>

      {/* Add User Modal */}
      <UserFormModal
        isOpen={showAddModal}
        onClose={closeModals}
        onSubmit={handleSubmitUser}
        user={null}
        isSubmitting={userSubmitting}
      />

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleSubmitUser}
        user={selectedUser}
        isSubmitting={userSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        user={selectedUser}
        isDeleting={userSubmitting}
      />
    </section>
  );
};

export default SystemAdminUserInventory;
