import React, { useEffect, useState } from "react";
import { fetchSecurityDashboard, logoutSession } from "../../../services/customerService";
import "./SecurityCenter.css";

const SecurityCenter = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const data = await fetchSecurityDashboard();
      console.log("Security Dashboard Data:", data);
      console.log("Security Status:", data?.security_status);
      console.log("Certificate:", data?.security_status?.certificate);
      console.log("Password:", data?.security_status?.password);
      console.log("Encryption:", data?.security_status?.encryption);
      console.log("2FA:", data?.security_status?.two_factor);
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to logout from this session?")) {
      return;
    }

    try {
      setLogoutLoading(sessionId);
      await logoutSession(sessionId);
      // Reload data after logout
      await loadSecurityData();
      alert("Session logout requested successfully");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to logout session");
    } finally {
      setLogoutLoading(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      SECURE: "emerald",
      NEEDS_ATTENTION: "amber",
      AT_RISK: "rose",
      VALID: "emerald",
      EXPIRING_SOON: "amber",
      EXPIRED: "rose",
      REVOKED: "rose",
      ACTIVE: "emerald",
      HIGH: "rose",
      MEDIUM: "amber",
      LOW: "slate"
    };
    return colors[status] || "slate";
  };

  const getSeverityIcon = (severity) => {
    if (severity === "HIGH") {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    if (severity === "MEDIUM") {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xl">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-cyan-500"></div>
            <p className="mt-4 text-slate-600">Loading security data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-xl font-bold text-rose-900">Error Loading Security Data</h3>
            <p className="mt-2 text-rose-700">{error}</p>
            <button
              onClick={loadSecurityData}
              className="mt-6 rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-rose-700 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { last_login, active_sessions, security_status, security_alerts } = dashboard || {};
  const overallStatus = security_status?.overall_status || "UNKNOWN";
  const overallScore = security_status?.overall_score || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="mt-1 text-slate-600">Monitor your account security and manage active sessions</p>
          </div>
          <button
            onClick={loadSecurityData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Security Score Card */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${
            overallStatus === "SECURE" ? "from-emerald-500 to-teal-600" :
            overallStatus === "NEEDS_ATTENTION" ? "from-amber-500 to-orange-600" :
            "from-rose-500 to-red-600"
          } p-8 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Security Status</h2>
                <p className="text-white/90">Overall security health of your account</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold">{overallScore}</div>
                <div className="text-sm text-white/80 mt-1">Security Score</div>
              </div>
            </div>
          </div>

          <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Certificate Status */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-full bg-${getStatusColor(security_status?.certificate?.status)}-50 p-2`}>
                  <svg className={`h-5 w-5 text-${getStatusColor(security_status?.certificate?.status)}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificate</p>
                  <p className={`text-sm font-bold text-${getStatusColor(security_status?.certificate?.status)}-700`}>
                    {security_status?.certificate?.status || "Unknown"}
                  </p>
                </div>
              </div>
              {security_status?.certificate?.valid_until && (
                <p className="text-xs text-slate-600">Valid until: {formatDate(security_status.certificate.valid_until)}</p>
              )}
            </div>

            {/* Password Strength */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-indigo-50 p-2">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</p>
                  <p className="text-sm font-bold text-indigo-700">{security_status?.password?.status || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      (security_status?.password?.score || 0) >= 80 ? "from-emerald-500 to-teal-500" :
                      (security_status?.password?.score || 0) >= 50 ? "from-amber-500 to-orange-500" :
                      "from-rose-500 to-red-500"
                    }`}
                    style={{ width: `${security_status?.password?.score || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-slate-600">{security_status?.password?.score || 0}%</span>
              </div>
            </div>

            {/* Encryption */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-purple-50 p-2">
                  <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encryption</p>
                  <p className="text-sm font-bold text-purple-700">{security_status?.encryption?.status || "Unknown"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">{security_status?.encryption?.type || "—"}</p>
            </div>

            {/* Two-Factor Auth */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-cyan-50 p-2">
                  <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2FA</p>
                  <p className="text-sm font-bold text-cyan-700">{security_status?.two_factor?.status || "Unknown"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">{security_status?.two_factor?.type || "—"}</p>
            </div>
          </div>
        </div>


        {/* Last Login & Active Sessions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Last Login */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Last Login</h3>
                <p className="text-sm text-slate-600">Your most recent account access</p>
              </div>
            </div>

            {last_login?.has_login ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <svg className="h-5 w-5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date & Time</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(last_login.timestamp)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <svg className="h-5 w-5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                    <p className="text-sm font-semibold text-slate-900">{last_login.location_string}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <svg className="h-5 w-5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Device</p>
                    <p className="text-sm font-semibold text-slate-900">{last_login.device_label}</p>
                    <p className="text-xs text-slate-500 mt-1">ID: {last_login.device_id}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-sm text-slate-500">No login history available</p>
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-600 p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Active Sessions</h3>
                <p className="text-sm text-slate-600">{active_sessions?.length || 0} active device(s)</p>
              </div>
            </div>

            {active_sessions && active_sessions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {active_sessions.map((session, index) => (
                  <div key={index} className={`rounded-2xl border p-4 ${
                    session.is_current 
                      ? "border-cyan-200 bg-gradient-to-br from-cyan-50 to-indigo-50" 
                      : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-bold text-slate-900">{session.device_label}</p>
                          {session.is_current && (
                            <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-xs font-semibold text-white">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-1">
                          <span className="font-semibold">Location:</span> {session.location}
                        </p>
                        <p className="text-xs text-slate-600 mb-1">
                          <span className="font-semibold">Last Active:</span> {formatDate(session.last_active)}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">ID: {session.device_id}</p>
                      </div>
                      {session.can_logout && (
                        <button
                          onClick={() => handleLogoutSession(session.session_id)}
                          disabled={logoutLoading === session.session_id}
                          className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 transition disabled:opacity-50"
                        >
                          {logoutLoading === session.session_id ? "..." : "Logout"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-sm text-slate-500">No active sessions found</p>
              </div>
            )}
          </div>
        </div>


        {/* Security Alerts */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-gradient-to-br from-amber-500 to-orange-600 p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Security Alerts</h3>
              <p className="text-sm text-slate-600">Recent security notifications (read-only)</p>
            </div>
          </div>

          {security_alerts && security_alerts.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {security_alerts.map((alert, index) => {
                const severityColor = getStatusColor(alert.severity);
                return (
                  <div key={index} className={`rounded-2xl border border-${severityColor}-200 bg-${severityColor}-50 p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full bg-${severityColor}-100 p-2 text-${severityColor}-600`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-bold text-${severityColor}-900`}>{alert.message}</p>
                          <span className={`rounded-full bg-${severityColor}-200 px-2 py-0.5 text-xs font-semibold text-${severityColor}-800`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{formatDate(alert.timestamp)}</p>
                        {alert.details && Object.keys(alert.details).length > 0 && (
                          <div className="mt-2 rounded-lg bg-white/50 p-2">
                            <p className="text-xs text-slate-700">
                              {alert.details.reason || "No additional details"}
                            </p>
                          </div>
                        )}
                      </div>
                      {alert.resolved && (
                        <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-sm text-emerald-600 font-semibold">No security alerts</p>
              <p className="text-xs text-slate-500 mt-1">Your account is secure</p>
            </div>
          )}
        </div>

        {/* Security Tips */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Security Tips</h3>
              <p className="text-sm text-slate-600">Best practices to keep your account secure</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <svg className="h-5 w-5 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-900">Keep your certificate secure</p>
                <p className="text-xs text-slate-600 mt-1">Never share your certificate or private keys with anyone</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <svg className="h-5 w-5 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-900">Monitor active sessions</p>
                <p className="text-xs text-slate-600 mt-1">Regularly check and logout from unused devices</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <svg className="h-5 w-5 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-900">Review security alerts</p>
                <p className="text-xs text-slate-600 mt-1">Check alerts regularly for suspicious activity</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <svg className="h-5 w-5 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-900">Use secure networks</p>
                <p className="text-xs text-slate-600 mt-1">Avoid public Wi-Fi for banking transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-600">
            🔒 All security data is encrypted and protected. Last updated: {formatDate(dashboard?.generated_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenter;
