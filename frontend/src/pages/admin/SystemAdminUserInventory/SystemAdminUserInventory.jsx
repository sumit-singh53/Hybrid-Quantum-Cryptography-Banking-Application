import React, { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import RolePulse from "../RolePulse";
import "./SystemAdminUserInventory.css";

const MANAGED_ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "auditor_clerk", label: "Auditor clerk" },
  { value: "manager", label: "Manager" },
];

const INITIAL_USER_FORM = {
  username: "",
  fullName: "",
  email: "",
  role: MANAGED_ROLE_OPTIONS[0].value,
  isActive: true,
};

const SystemAdminUserInventory = () => {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [userBanner, setUserBanner] = useState("");
  const [userForm, setUserForm] = useState(() => ({ ...INITIAL_USER_FORM }));
  const [editingUserId, setEditingUserId] = useState(null);
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const managedRoleParam = useMemo(
    () => MANAGED_ROLE_OPTIONS.map((option) => option.value).join(","),
    [],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const username = (user.username || "").toLowerCase();
      const fullName = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      return username.includes(query) || fullName.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [users, search]);

  const loadSummary = useCallback(async () => {
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const payload = await systemAdminService.getCertificateSummary();
      setSummary(payload || {});
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setSummaryError(message || "Unable to load certificate inventory");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const payload = await systemAdminService.listUsers({ roles: managedRoleParam });
      setUsers(payload?.users || []);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [managedRoleParam]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetUserForm = () => {
    setUserForm({ ...INITIAL_USER_FORM });
    setEditingUserId(null);
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setUsersError("");
    setUserBanner("");

    const payload = {
      username: userForm.username.trim(),
      full_name: userForm.fullName.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      is_active: userForm.isActive,
    };

    if (!payload.username || !payload.full_name || !payload.email) {
      setUsersError("Username, full name, and email are required.");
      return;
    }

    setUserSubmitting(true);
    try {
      if (editingUserId) {
        await systemAdminService.updateUser(editingUserId, payload);
        setUserBanner(`Updated user "${payload.username}"`);
      } else {
        await systemAdminService.createUser(payload);
        setUserBanner(`Created user "${payload.username}"`);
      }
      resetUserForm();
      await loadUsers();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to save user");
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleUserEdit = (user) => {
    setEditingUserId(user.id);
    setUserBanner("");
    setUsersError("");
    setUserForm({
      username: user.username || "",
      fullName: user.full_name || "",
      email: user.email || "",
      role: user.role || MANAGED_ROLE_OPTIONS[0].value,
      isActive: user.is_active !== false,
    });
  };

  const handleUserDelete = async (user) => {
    if (!user || !user.id) {
      return;
    }
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Delete ${user.username || "user"}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    setUsersError("");
    setUserBanner("");
    try {
      await systemAdminService.deleteUser(user.id);
      if (editingUserId === user.id) {
        resetUserForm();
      }
      setUserBanner(`Deleted user "${user.username}"`);
      await loadUsers();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to delete user");
    }
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              User inventory
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Manage users & certificates
            </h1>
            {summaryError && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {summaryError}
              </p>
            )}
          </div>
          <button
            onClick={loadSummary}
            disabled={summaryLoading}
            className="h-fit rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {summaryLoading ? "Syncing" : "Refresh inventory"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-100">
          Role distribution
        </h3>
        <p className="text-sm text-slate-400">
          Live tally per privileged role.
        </p>
        <div className="mt-6">
          {summaryLoading && !summary ? (
            <p className="text-sm text-slate-400">
              Loading certificate counts…
            </p>
          ) : (
            <RolePulse roleBreakdown={summary?.by_role || {}} />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-100">
          Manage privileged users (CRUD)
        </h3>
        <p className="text-sm text-slate-400">
          Provision and sunset customer, auditor clerk, and manager identities.
        </p>

        {/* Search Bar */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search by username, name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {(usersError || userBanner) && (
          <div className="mt-4 space-y-2">
            {usersError && (
              <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                ⚠️ {usersError}
              </p>
            )}
            {userBanner && (
              <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {userBanner}
              </p>
            )}
          </div>
        )}

        <form
          className="mt-6 grid gap-4 md:grid-cols-[repeat(5,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]"
          onSubmit={handleUserSubmit}
        >
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Username
            <input
              name="username"
              value={userForm.username}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, username: event.target.value }))
              }
              placeholder="jane.doe"
              required
              disabled={userSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Full name
            <input
              name="fullName"
              value={userForm.fullName}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              placeholder="Jane Doe"
              required
              disabled={userSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Email
            <input
              type="email"
              name="email"
              value={userForm.email}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="jane@example.com"
              required
              disabled={userSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Role
            <select
              name="role"
              value={userForm.role}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, role: event.target.value }))
              }
              disabled={userSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
            >
              {MANAGED_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Status
            <select
              name="status"
              value={userForm.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  isActive: event.target.value === "active",
                }))
              }
              disabled={userSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button
              className="w-full rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={userSubmitting}
            >
              {editingUserId ? "Update user" : "Add user"}
            </button>
            {editingUserId && (
              <button
                type="button"
                onClick={resetUserForm}
                disabled={userSubmitting}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
                    {search ? "No users match your search." : "No managed users found."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">
                        {user.full_name}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {user.username}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 uppercase tracking-wide text-slate-400">
                      {user.role}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-4 text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => handleUserEdit(user)}
                          className="text-cyan-200 transition hover:text-cyan-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserDelete(user)}
                          className="text-rose-300 transition hover:text-rose-200"
                        >
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
    </section>
  );
};

export default SystemAdminUserInventory;
