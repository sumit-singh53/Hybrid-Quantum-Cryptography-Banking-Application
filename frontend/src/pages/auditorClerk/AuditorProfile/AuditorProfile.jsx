import React, { useEffect, useState } from "react";
import { fetchAuditorProfile } from "../../../services/auditorClerkService";
import "./AuditorProfile.css";

const AuditorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchAuditorProfile();
        setProfile(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load profile");
      }
    };

    loadProfile();
  }, []);

  if (error) {
    return <p className="text-sm font-medium text-rose-400">{error}</p>;
  }

  if (!profile) {
    return <p className="text-sm text-slate-400">Loading profile…</p>;
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">
          Auditor Clerk Profile
        </h2>
        <p className="mt-2 text-base text-slate-400">
          Read-only credentials tied to your hybrid certificate.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Identity</h3>
        <dl className="mt-4 grid gap-3 text-sm text-slate-300">
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Name</dt>
            <dd>{profile.user?.username}</dd>
          </div>
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">User ID</dt>
            <dd className="font-mono text-xs text-slate-400">
              {profile.user?.id}
            </dd>
          </div>
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Role</dt>
            <dd className="uppercase tracking-wide">{profile.user?.role}</dd>
          </div>
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Allowed Actions</dt>
            <dd>{profile.certificate?.allowed_actions}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Certificate</h3>
        <dl className="mt-4 grid gap-3 text-sm text-slate-300">
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Certificate ID</dt>
            <dd className="font-mono text-xs text-slate-400">
              {profile.certificate?.certificate_id}
            </dd>
          </div>
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Lineage</dt>
            <dd>{profile.certificate?.lineage_id}</dd>
          </div>
          <div className="flex items-start justify-between">
            <dt className="text-slate-400">Valid To</dt>
            <dd>{profile.certificate?.valid_to}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Recent Login</h3>
        {profile.last_login ? (
          <dl className="mt-4 grid gap-3 text-sm text-slate-300">
            <div className="flex items-start justify-between">
              <dt className="text-slate-400">Timestamp</dt>
              <dd>{profile.last_login.timestamp}</dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="text-slate-400">Intent</dt>
              <dd>{profile.last_login.intent}</dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="text-slate-400">Origin IP</dt>
              <dd>{profile.last_login.location?.ip || "--"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            No login metadata recorded yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default AuditorProfile;
