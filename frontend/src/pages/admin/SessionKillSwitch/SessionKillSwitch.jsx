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
      className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl"
    >
      <h3 className="text-xl font-semibold text-slate-100">
        Session kill switch
      </h3>
      <p className="text-sm text-slate-400">
        Target a single operator or an entire role cohort to invalidate active
        sessions instantly.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleKill}>
        <label className="block text-sm text-slate-300">
          Target user ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="optional user identifier"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Role blast radius
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="system_admin"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </label>
        <button
          className="w-full rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/70 to-orange-500/70 px-5 py-2 text-sm font-semibold text-white shadow-inner transition hover:from-rose-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Revoking sessions…" : "Terminate sessions"}
        </button>
        {status && (
          <p
            className={
              status.type === "success"
                ? "text-sm font-medium text-emerald-300"
                : "text-sm font-medium text-rose-300"
            }
          >
            {status.text}
          </p>
        )}
      </form>
    </div>
  );
};

export default SessionKillSwitch;
