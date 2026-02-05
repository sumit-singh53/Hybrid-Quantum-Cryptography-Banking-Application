import React, { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./SystemAdminRoleInsights.css";

const initialRoleForm = { name: "" };

const SystemAdminRoleInsights = () => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roleForm, setRoleForm] = useState(initialRoleForm);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleEditing, setRoleEditing] = useState(null);

  const notify = useCallback((message, type = "info") => {
    const prefix = type === "error" ? "❌" : "✅";
    if (typeof window !== "undefined" && window?.Notification) {
      if (Notification.permission === "granted") {
        new Notification(`${prefix} ${message}`);
        return;
      }
    }
    const logger = type === "error" ? console.error : console.log;
    logger(`${prefix} ${message}`);
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const payload = await systemAdminService.listRoles();
      setRoles(payload?.roles || []);
    } catch (error) {
      console.error("Failed to load roles", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load roles";
      setRolesError(message);
      notify(message, "error");
    } finally {
      setRolesLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const resetRoleForm = useCallback(() => {
    setRoleForm(initialRoleForm);
    setRoleEditing(null);
  }, []);

  const handleRoleEdit = (role) => {
    setRoleEditing(role);
    setRoleForm({ name: role?.name || "" });
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    setRolesError("");
    const normalizedName = (roleForm.name || "").trim();
    if (!normalizedName) {
      setRolesError("Role name is required");
      return;
    }
    setRoleSubmitting(true);
    try {
      if (roleEditing) {
        await systemAdminService.updateRole(roleEditing.id, {
          name: normalizedName,
        });
        notify(`Updated role "${normalizedName}"`);
      } else {
        await systemAdminService.createRole({ name: normalizedName });
        notify(`Created role "${normalizedName}"`);
      }
      resetRoleForm();
      await loadRoles();
    } catch (error) {
      console.error("Failed to save role", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save role";
      setRolesError(message);
      notify(message, "error");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleRoleDelete = async (role) => {
    if (!role || role.user_count > 0 || role.is_system_role) {
      return;
    }
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Delete role "${role.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    try {
      await systemAdminService.deleteRole(role.id);
      notify(`Deleted role "${role.name}"`);
      await loadRoles();
    } catch (error) {
      console.error("Failed to delete role", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to delete role";
      setRolesError(message);
      notify(message, "error");
    }
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Role insights
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Manage system roles
            </h1>
            {rolesError && (
              <p className="mt-3 text-sm font-medium text-rose-200">
                ⚠️ {rolesError}
              </p>
            )}
          </div>
          <button
            onClick={loadRoles}
            disabled={rolesLoading}
            className="h-fit rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rolesLoading ? "Syncing" : "Refresh roles"}
          </button>
        </div>
        <form
          className="mt-6 grid gap-4 md:grid-cols-[2fr_auto]"
          onSubmit={handleRoleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Role name
            <input
              name="role-name"
              value={roleForm.name}
              onChange={(event) => setRoleForm({ name: event.target.value })}
              placeholder="system_admin"
              required
              disabled={roleSubmitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-70"
            />
          </label>
          <div className="flex items-end gap-3">
            <button
              className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={roleSubmitting}
            >
              {roleEditing ? "Update role" : "Add role"}
            </button>
            {roleEditing && (
              <button
                type="button"
                onClick={resetRoleForm}
                className="whitespace-nowrap rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assignments</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {rolesLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                    Loading roles…
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                    No roles found. Add one to get started.
                  </td>
                </tr>
              ) : (
                roles.map((entry) => {
                  const isLocked = entry.user_count > 0 || entry.is_system_role;
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 uppercase tracking-wide text-slate-300">
                        {entry.name}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {entry.user_count}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {entry.is_system_role ? "System" : "Custom"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-4 text-sm font-semibold">
                          <button
                            type="button"
                            onClick={() => handleRoleEdit(entry)}
                            className="text-cyan-200 transition hover:text-cyan-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoleDelete(entry)}
                            disabled={isLocked}
                            className={`text-rose-300 transition hover:text-rose-200 ${
                              isLocked ? "cursor-not-allowed opacity-40" : ""
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SystemAdminRoleInsights;
