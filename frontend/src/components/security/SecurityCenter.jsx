import React, { useEffect, useState } from "react";
import {
  fetchCustomerOverview,
  fetchCustomerAuditTrail,
  fetchSecurityStatus,
} from "../../services/customerService";

const SecurityCenter = () => {
  const [overview, setOverview] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        setLoading(true);
        const [ov, audit, security] = await Promise.all([
          fetchCustomerOverview(),
          fetchCustomerAuditTrail(),
          fetchSecurityStatus(),
        ]);
        setOverview(ov);
        setAuditTrail(audit || []);
        setSecurityStatus(security);
        setError(null);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load security data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] text-cyan-600"></div>
          <p className="mt-4 text-slate-600">Evaluating security posture…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview || !securityStatus) {
    return <p className="p-6 text-slate-600">No security data available.</p>;
  }

  const deviceState = securityStatus.device_state || {};
  const requiresReverify = deviceState.requires_reverify;
  const certificate = securityStatus.certificate || {};
  const lastLogin = securityStatus.last_login || {};
  const securityEvents = securityStatus.security_events || {};

  const getCertificateStatusColor = (status) => {
    switch (status) {
      case "Valid":
        return "text-emerald-800 bg-emerald-50 border-emerald-200";
      case "Expiring Soon":
        return "text-amber-800 bg-amber-50 border-amber-200";
      case "Expired":
        return "text-red-800 bg-red-50 border-red-200";
      case "Revoked":
        return "text-red-800 bg-red-50 border-red-200";
      default:
        return "text-slate-800 bg-slate-50 border-slate-200";
    }
  };

  const formatLocation = (login) => {
    if (!login) return "--";
    const { city, country, ip } = login;
    if (city && country) return `${city}, ${country}`;
    if (city || country) return city || country;
    if (ip) return ip;
    return "Location unavailable";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "--";
    try {
      return new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="h-8 w-8 text-cyan-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-slate-900">
              Security Center
            </h1>
          </div>
          <p className="text-slate-600">
            Review certificate posture, device bindings, and immutable audit
            logs.
          </p>
        </div>

        {/* Certificate Health */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg
              className="h-6 w-6 text-cyan-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Certificate Health
          </h2>
          <div
            className={`rounded-xl border p-6 shadow-sm ${getCertificateStatusColor(
              certificate.status
            )}`}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium opacity-75 mb-1">Status</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {certificate.status === "Valid" && (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {certificate.status || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium opacity-75 mb-1">
                  Valid Until
                </p>
                <p className="text-lg font-bold">
                  {certificate.valid_to
                    ? new Date(certificate.valid_to).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium opacity-75 mb-1">
                  Certificate ID
                </p>
                <p className="text-sm font-mono break-all">
                  {certificate.certificate_id
                    ? `${certificate.certificate_id.substring(0, 16)}...`
                    : "--"}
                </p>
              </div>
            </div>
            {certificate.lineage_id && (
              <div className="mt-4 pt-4 border-t border-current opacity-50">
                <p className="text-sm">
                  <span className="font-medium">Lineage:</span>{" "}
                  <span className="font-mono">{certificate.lineage_id}</span>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Device Binding & Encryption - Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Device Binding */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Device Binding
            </h2>
            <div
              className={`rounded-xl border p-6 shadow-sm ${
                requiresReverify
                  ? "bg-amber-50 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              {requiresReverify && (
                <div className="mb-4 p-3 rounded-lg bg-amber-100 border border-amber-300">
                  <p className="text-amber-900 text-sm font-semibold flex items-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Device Mismatch Detected
                  </p>
                  <p className="text-amber-800 text-xs mt-1">
                    Please re-run the certificate login flow on the correct
                    device to re-issue trust.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Enrolled Device ID
                  </p>
                  <p className="text-sm font-mono bg-slate-100 px-3 py-2 rounded border border-slate-200 break-all">
                    {deviceState.enrolled_device_id || "Not enrolled"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Session Device ID
                  </p>
                  <p className="text-sm font-mono bg-slate-100 px-3 py-2 rounded border border-slate-200 break-all">
                    {deviceState.session_device_id || "No active session"}
                  </p>
                </div>
                {deviceState.device_label && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Device Label
                    </p>
                    <p className="text-sm font-mono bg-slate-100 px-3 py-2 rounded border border-slate-200">
                      {deviceState.device_label}
                    </p>
                  </div>
                )}
                {!requiresReverify && deviceState.bound && (
                  <div className="flex items-center gap-2 text-emerald-700 mt-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold">
                      Device binding validated for this session
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Encryption Status */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg
                className="h-6 w-6 text-cyan-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Encryption Status
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Status
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {securityStatus.encryption?.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                    <svg
                      className="h-7 w-7 text-cyan-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-600 mb-2">
                    Encryption Type
                  </p>
                  <p className="text-sm text-slate-900">
                    {securityStatus.encryption?.type || "PQ + RSA hybrid"}
                  </p>
                </div>
                <div className="rounded-lg bg-cyan-50 px-4 py-3 border border-cyan-200">
                  <p className="text-xs font-medium text-slate-600 mb-1">
                    Algorithm
                  </p>
                  <p className="text-sm font-mono font-bold text-cyan-700">
                    {securityStatus.encryption?.algorithm || "ML-KEM + RSA"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold">
                    End-to-end encryption active
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Last Login & Security Alerts - Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Last Login */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg
                className="h-6 w-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Last Login
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Timestamp
                    </p>
                    <p className="text-sm font-mono text-slate-900">
                      {formatTimestamp(lastLogin.timestamp)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Origin IP
                  </p>
                  <p className="text-sm font-mono bg-slate-100 px-3 py-2 rounded border border-slate-200">
                    {lastLogin.ip || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Location
                  </p>
                  <p className="text-sm text-slate-900">
                    {formatLocation(lastLogin)}
                  </p>
                </div>
                {lastLogin.device_id && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Device ID
                    </p>
                    <p className="text-xs font-mono bg-slate-100 px-3 py-2 rounded border border-slate-200 break-all">
                      {lastLogin.device_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Security Alerts */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Security Alerts
            </h2>
            <div
              className={`rounded-xl border p-6 shadow-sm ${
                securityEvents.total_count > 0
                  ? "bg-orange-50 border-orange-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="text-center py-4">
                <div
                  className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-3 ${
                    securityEvents.total_count > 0
                      ? "bg-orange-100"
                      : "bg-emerald-100"
                  }`}
                >
                  {securityEvents.total_count > 0 ? (
                    <svg
                      className="h-8 w-8 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-8 w-8 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {securityEvents.total_count || 0}
                </p>
                <p className="text-sm text-slate-600">
                  {securityEvents.total_count === 0
                    ? "No security alerts"
                    : `Security event${securityEvents.total_count !== 1 ? "s" : ""} detected`}
                </p>
                {securityEvents.total_count === 0 && (
                  <p className="text-xs text-emerald-700 mt-2 font-semibold">
                    All systems secure
                  </p>
                )}
              </div>
              {securityEvents.recent && securityEvents.recent.length > 0 && (
                <div className="mt-4 pt-4 border-t border-orange-300">
                  <p className="text-sm font-semibold text-orange-900 mb-2">
                    Recent Events:
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {securityEvents.recent.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white rounded px-2 py-1.5 border border-orange-200"
                      >
                        <span className="font-mono text-orange-700">
                          {event.event_type}
                        </span>
                        <span className="text-slate-500 ml-2">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Immutable Audit Trail */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg
              className="h-6 w-6 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Immutable Audit Trail
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {auditTrail.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <svg
                  className="h-12 w-12 mx-auto mb-3 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>No request activity recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        When
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Path
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Device
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditTrail
                      .slice()
                      .reverse()
                      .slice(0, 20)
                      .map((entry, index) => (
                        <tr
                          key={entry.entry_hash || index}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-mono text-slate-600 whitespace-nowrap">
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                              {entry.action_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-600">
                            {entry.path}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {entry.device_id
                              ? `${entry.device_id.substring(0, 16)}...`
                              : "--"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {auditTrail.length > 20 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center text-sm text-slate-600">
                    Showing last 20 of {auditTrail.length} entries
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SecurityCenter;
