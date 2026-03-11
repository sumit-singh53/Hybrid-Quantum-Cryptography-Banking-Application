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
  const [error, setError] = useState(null);
  
  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("pq_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserInfo();
  
  // Pagination state
  const eventsPerPage = 10;
  const auditsPerPage = 15;

  const loadSecurityEvents = useCallback(async (page = 1) => {
    const response = await systemAdminService.getSecurityEvents({ 
      limit: eventsPerPage,
      page: page 
    });
    setSecurityEvents(response.events || response);
  }, [eventsPerPage]);

  const loadAuditFeed = useCallback(async (page = 1) => {
    const response = await systemAdminService.getGlobalAuditFeed({ 
      limit: auditsPerPage,
      page: page 
    });
    setAuditFeed(response.audits || response);
  }, [auditsPerPage]);

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
    }
  }, [loadAuditFeed, loadSecurityEvents]);

  useEffect(() => {
    hydrateOverview();
  }, [hydrateOverview]);

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
      <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        {/* Skeleton Header */}
        <div className="rounded-3xl border p-6 shadow-2xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-800/50 dark:bg-slate-950/60">
          <div className="animate-pulse">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800/50"></div>
            <div className="mt-3 h-8 w-96 rounded bg-slate-200 dark:bg-slate-800/50"></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
              ))}
            </div>
          </div>
        </div>
        {/* Skeleton Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-900/60"></div>
          ))}
        </div>
      </section>
    );
  }

  const systemHealth = overviewMetrics.deviceAlerts === 0 ? 'healthy' : 
                       overviewMetrics.deviceAlerts < 5 ? 'warning' : 'critical';
  const healthConfig = {
    healthy: { color: 'emerald', label: 'All Systems Operational', icon: '✓' },
    warning: { color: 'amber', label: 'Minor Issues Detected', icon: '⚠' },
    critical: { color: 'rose', label: 'Critical Alerts Active', icon: '⚠' }
  };
  const healthStatus = healthConfig[systemHealth];

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header Section - Enhanced */}
      <div className="rounded-3xl border p-6 shadow-2xl transition-all duration-300 border-indigo-400/30 bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:border-indigo-400/30 dark:from-slate-950 dark:via-slate-900/80 dark:to-indigo-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                System Admin Control Plane
              </p>
              {/* System Health Badge */}
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                systemHealth === 'healthy' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                systemHealth === 'warning' ? 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  systemHealth === 'healthy' ? 'bg-emerald-500 animate-pulse' :
                  systemHealth === 'warning' ? 'bg-amber-500 animate-pulse' :
                  'bg-rose-500 animate-pulse'
                }`}></span>
                {healthStatus.label}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl text-slate-900 dark:text-white">
              Welcome Back, {user?.username || 'Admin'}! 👋
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
              Operational trust &amp; certificate authority command
            </p>
            {user && user.role && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 dark:border-cyan-400/30 dark:bg-cyan-500/10">
                <svg className="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-cyan-900 dark:text-cyan-100">
                  Role: <span className="font-semibold capitalize">{user.role.name || user.role}</span>
                </span>
              </div>
            )}
            {error && (
              <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {/* Total Certificates */}
          <div className="group relative overflow-hidden rounded-2xl border p-4 transition hover:shadow-lg border-cyan-300/30 bg-gradient-to-br from-cyan-50 to-white hover:border-cyan-400/50 hover:shadow-cyan-200/30 dark:border-cyan-400/20 dark:from-cyan-950/40 dark:to-slate-950/40 dark:hover:border-cyan-400/40 dark:hover:shadow-cyan-500/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <small className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300/80">
                  Total Certificates
                </small>
                <div className="rounded-lg p-1.5 bg-cyan-500/20">
                  <svg className="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {overviewMetrics.totalCertificates}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-300/70">
                <span className="inline-flex items-center">
                  Active PKI inventory
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 transition group-hover:opacity-100"></div>
          </div>

          {/* Revoked Certificates */}
          <div className="group relative overflow-hidden rounded-2xl border p-4 transition hover:shadow-lg border-rose-300/30 bg-gradient-to-br from-rose-50 to-white hover:border-rose-400/50 hover:shadow-rose-200/30 dark:border-rose-400/20 dark:from-rose-950/40 dark:to-slate-950/40 dark:hover:border-rose-400/40 dark:hover:shadow-rose-500/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <small className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300/80">
                  Revoked
                </small>
                <div className="rounded-lg p-1.5 bg-rose-500/20">
                  <svg className="h-4 w-4 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {overviewMetrics.revokedCount}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-rose-700 dark:text-rose-300/70">
                {overviewMetrics.revokedCount === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    No revocations
                  </span>
                ) : (
                  <span>CRL entries active</span>
                )}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 opacity-0 transition group-hover:opacity-100"></div>
          </div>

          {/* Device Alerts */}
          <div className={`group relative overflow-hidden rounded-2xl border p-4 transition hover:shadow-lg ${
            overviewMetrics.deviceAlerts === 0 
              ? 'border-emerald-300/30 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-400/50 hover:shadow-emerald-200/30 dark:border-emerald-400/20 dark:from-emerald-950/40 dark:to-slate-950/40 dark:hover:border-emerald-400/40 dark:hover:shadow-emerald-500/10'
              : 'border-amber-300/30 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400/50 hover:shadow-amber-200/30 dark:border-amber-400/20 dark:from-amber-950/40 dark:to-slate-950/40 dark:hover:border-amber-400/40 dark:hover:shadow-amber-500/10'
          }`}>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <small className={`text-xs font-semibold uppercase tracking-wider ${
                  overviewMetrics.deviceAlerts === 0 ? 'text-emerald-700 dark:text-emerald-300/80' : 'text-amber-700 dark:text-amber-300/80'
                }`}>
                  Device Alerts
                </small>
                <div className={`rounded-lg p-1.5 ${
                  overviewMetrics.deviceAlerts === 0 ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                }`}>
                  <svg className={`h-4 w-4 ${overviewMetrics.deviceAlerts === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {overviewMetrics.deviceAlerts}
              </p>
              <div className={`mt-2 flex items-center gap-1 text-xs ${
                overviewMetrics.deviceAlerts === 0 ? 'text-emerald-700 dark:text-emerald-300/70' : 'text-amber-700 dark:text-amber-300/70'
              }`}>
                {overviewMetrics.deviceAlerts === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All devices verified
                  </span>
                ) : (
                  <span>Requires attention</span>
                )}
              </div>
            </div>
            <div className={`absolute inset-0 bg-gradient-to-r opacity-0 transition group-hover:opacity-100 ${
              overviewMetrics.deviceAlerts === 0 
                ? 'from-emerald-500/0 via-emerald-500/5 to-emerald-500/0'
                : 'from-amber-500/0 via-amber-500/5 to-amber-500/0'
            }`}></div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="/admin/certificates/issue"
          className="group relative overflow-hidden rounded-2xl border p-5 transition no-underline border-cyan-300/30 bg-gradient-to-br from-white to-slate-50 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-200/30 dark:border-cyan-400/20 dark:from-slate-950/80 dark:to-slate-900/60 dark:hover:border-cyan-400/50 dark:hover:shadow-cyan-500/20"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm transition group-hover:scale-110 bg-cyan-500/20 group-hover:bg-cyan-500/30">
                <svg className="h-6 w-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <svg className="h-5 w-5 transition group-hover:translate-x-1 text-cyan-500/50 group-hover:text-cyan-600 dark:text-cyan-400/50 dark:group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-base font-semibold transition text-slate-900 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-300">
                Issue Certificate
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Create new PKI credentials
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/5 to-transparent opacity-0 transition group-hover:opacity-100"></div>
        </a>

        <a
          href="/admin/certificates/crl"
          className="group relative overflow-hidden rounded-2xl border p-5 transition no-underline border-rose-300/30 bg-gradient-to-br from-white to-slate-50 hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-200/30 dark:border-rose-400/20 dark:from-slate-950/80 dark:to-slate-900/60 dark:hover:border-rose-400/50 dark:hover:shadow-rose-500/20"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm transition group-hover:scale-110 bg-rose-500/20 group-hover:bg-rose-500/30">
                <svg className="h-6 w-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <svg className="h-5 w-5 transition group-hover:translate-x-1 text-rose-500/50 group-hover:text-rose-600 dark:text-rose-400/50 dark:group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-base font-semibold transition text-slate-900 group-hover:text-rose-700 dark:text-white dark:group-hover:text-rose-300">
                CRL Management
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Revoke compromised certs
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 via-rose-500/5 to-transparent opacity-0 transition group-hover:opacity-100"></div>
        </a>

        <a
          href="/admin/users"
          className="group relative overflow-hidden rounded-2xl border p-5 transition no-underline border-blue-300/30 bg-gradient-to-br from-white to-slate-50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-200/30 dark:border-blue-400/20 dark:from-slate-950/80 dark:to-slate-900/60 dark:hover:border-blue-400/50 dark:hover:shadow-blue-500/20"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm transition group-hover:scale-110 bg-blue-500/20 group-hover:bg-blue-500/30">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <svg className="h-5 w-5 transition group-hover:translate-x-1 text-blue-500/50 group-hover:text-blue-600 dark:text-blue-400/50 dark:group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-base font-semibold transition text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
                User Inventory
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Manage user accounts
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-transparent opacity-0 transition group-hover:opacity-100"></div>
        </a>

        <a
          href="/admin/audit/global"
          className="group relative overflow-hidden rounded-2xl border p-5 transition no-underline border-emerald-300/30 bg-gradient-to-br from-white to-slate-50 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-200/30 dark:border-emerald-400/20 dark:from-slate-950/80 dark:to-slate-900/60 dark:hover:border-emerald-400/50 dark:hover:shadow-emerald-500/20"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm transition group-hover:scale-110 bg-emerald-500/20 group-hover:bg-emerald-500/30">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <svg className="h-5 w-5 transition group-hover:translate-x-1 text-emerald-500/50 group-hover:text-emerald-600 dark:text-emerald-400/50 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-base font-semibold transition text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                Audit Logs
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                View system activity
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-transparent opacity-0 transition group-hover:opacity-100"></div>
        </a>
      </div>

      {/* Enhanced Role Distribution */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-indigo-300/30 bg-gradient-to-br from-white to-indigo-50 dark:border-indigo-400/20 dark:from-slate-950/80 dark:to-indigo-950/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-indigo-500/20">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Role distribution
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Active certificate inventory by role
            </p>
          </div>
          <a
            href="/admin/roles"
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition no-underline border-indigo-400/30 bg-indigo-500/10 text-indigo-700 hover:border-indigo-400/50 hover:bg-indigo-500/20 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/20"
          >
            Manage roles
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div className="mt-5">
          <RolePulse roleBreakdown={overview?.certificates?.by_role || {}} />
        </div>
      </div>

      {/* Activity Feeds - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityEventFeed
          sectionId="sys-admin-security-feed"
          events={securityEvents.slice(0, 10)}
          onRefresh={loadSecurityEvents}
        />
        <GlobalAuditFeed
          sectionId="sys-admin-audit"
          entries={auditFeed.slice(0, 10)}
          onRefresh={loadAuditFeed}
        />
      </div>
    </section>
  );
};

export default SystemAdminDashboard;

