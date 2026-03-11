import React, { useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./SessionKillSwitch.css";

const SessionKillSwitch = ({ sectionId, onKill }) => {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleKill = async (event) => {
    event.preventDefault();
    if (!userId && !role) {
      setStatus({ type: "error", text: "Provide user_id or role" });
      return;
    }

    setLoading(true);
    setStatus(null);
    const payload = {};
    if (userId.trim()) {
      payload.user_id = userId.trim();
    }
    if (role.trim()) {
      payload.role = role.trim();
    }

    try {
      const response = await systemAdminService.killSessions(payload);
      setStatus({
        type: "success",
        text: response?.message || "Sessions revoked",
      });
      if (onKill) {
        onKill({
          userId: payload.user_id || null,
          role: payload.role || null,
          terminatedSessions:
            response?.terminated_sessions ||
            response?.sessions_terminated ||
            response?.count ||
            0,
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        text:
          err?.response?.data?.message ||
          err.message ||
          "Unable to terminate sessions",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id={sectionId}
      className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <span className="material-icons text-rose-600 dark:text-rose-400">power_settings_new</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Session Kill Switch
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Emergency session termination control
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
        Target a single operator or an entire role cohort to invalidate active
        sessions instantly.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleKill}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Target User ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="optional user identifier"
            className="mt-2 w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/40"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Role Blast Radius
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g., system_admin, manager, customer"
            className="mt-2 w-full rounded-2xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/40"
          />
        </label>
        <button
          className="w-full rounded-2xl border px-5 py-3 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 border-rose-500/40 bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600 hover:shadow-xl dark:border-rose-500/50 dark:from-rose-500/90 dark:to-orange-500/90 dark:hover:from-rose-500 dark:hover:to-orange-500"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Revoking sessions…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="material-icons text-lg">power_settings_new</span>
              Terminate Sessions
            </span>
          )}
        </button>
        {status && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              status.type === "success"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-icons text-lg">
                {status.type === "success" ? "check_circle" : "error"}
              </span>
              {status.text}
            </div>
          </div>
        )}
      </form>
      
      {/* Warning Notice */}
      <div className="mt-6 rounded-2xl border px-4 py-3 border-amber-400/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start gap-3">
          <span className="material-icons text-amber-600 dark:text-amber-300 text-lg">warning</span>
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-200">Critical Action</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              This action immediately terminates all matching sessions. Users will be logged out and must re-authenticate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionKillSwitch;
