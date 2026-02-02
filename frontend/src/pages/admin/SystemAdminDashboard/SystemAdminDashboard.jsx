import React, { useCallback, useEffect, useMemo, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import SecurityEventFeed from "../SecurityEventFeed";
import GlobalAuditFeed from "../GlobalAuditFeed";
import RolePulse from "../RolePulse";
import "./SystemAdminDashboard.css";

const SystemAdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [auditFeed, setAuditFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadSecurityEvents = useCallback(async () => {
    const events = await systemAdminService.getSecurityEvents({ limit: 40 });
    setSecurityEvents(events);
  }, []);

  const loadAuditFeed = useCallback(async () => {
    const audits = await systemAdminService.getGlobalAuditFeed({ limit: 60 });
    setAuditFeed(audits);
  }, []);

  const hydrateOverview = useCallback(async () => {
    setError(null);
    try {
      const payload = await systemAdminService.getOverview();
      setOverview(payload);
      await Promise.all([loadSecurityEvents(), loadAuditFeed()]);
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message || "Unable to load system admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAuditFeed, loadSecurityEvents]);

  useEffect(() => {
    hydrateOverview();
  }, [hydrateOverview]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await hydrateOverview();
  };

  const overviewMetrics = useMemo(
    () => ({
      totalCertificates: overview?.certificates?.total || 0,
      revokedCount: overview?.crl?.revoked_count || 0,
      deviceAlerts: overview?.security?.event_counts?.device_mismatch || 0,
    }),
    [overview],
  );

  if (loading && !overview) {
    return (
      <section className="rounded-3xl border border-slate-900 bg-slate-950/60 p-8 text-center font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-300">
        <p>Calibrating secure controls…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-8 shadow-2xl">
        <div className="space-y-5">
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            System Admin Control Plane
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Operational trust &amp; certificate authority command
          </h1>
          <p className="text-base text-slate-200/80">
            Issue privileged certificates, heal revocation lists, rotate CA
            keys, and supervise every audit signal from a single high-trust
            surface.
          </p>
          {error && (
            <p className="text-sm font-medium text-rose-200">⚠️ {error}</p>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4">
            <small className="text-xs uppercase tracking-wide text-slate-400">
              Total certificates
            </small>
            <p className="mt-2 text-3xl font-semibold text-white">
              {overviewMetrics.totalCertificates}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4">
            <small className="text-xs uppercase tracking-wide text-slate-400">
              Revoked
            </small>
            <p className="mt-2 text-3xl font-semibold text-white">
              {overviewMetrics.revokedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4">
            <small className="text-xs uppercase tracking-wide text-slate-400">
              Device alerts
            </small>
            <p className="mt-2 text-3xl font-semibold text-white">
              {overviewMetrics.deviceAlerts}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-5 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh intelligence"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-100">
          Role distribution
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Inventory by active trust roles.
        </p>
        <div className="mt-6">
          <RolePulse roleBreakdown={overview?.certificates?.by_role || {}} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityEventFeed
          sectionId="sys-admin-security-feed"
          events={securityEvents}
          onRefresh={loadSecurityEvents}
        />
        <GlobalAuditFeed
          sectionId="sys-admin-audit"
          entries={auditFeed}
          onRefresh={loadAuditFeed}
        />
      </div>
    </section>
  );
};

export default SystemAdminDashboard;
