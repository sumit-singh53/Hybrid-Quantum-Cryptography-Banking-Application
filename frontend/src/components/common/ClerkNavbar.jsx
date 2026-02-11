import React, { useEffect, useState, useRef } from "react";
import { BellIcon, UserCircleIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { siteIdentity } from "../../constants/siteIdentity";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchAuditorDashboard } from "../../services/auditorClerkService";

const ClerkNavbar = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const data = await fetchAuditorDashboard();
        const pending = data?.pending_queue?.length || 0;
        setPendingCount(pending);
        setStats({
          pendingInvestigations: pending,
          crlDrift: data?.crl_drift || 0,
          policyAlerts: data?.policy_alerts?.length || 0,
        });
      } catch (err) {
        console.error("Failed to fetch auditor stats:", err);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showProfile || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile, showNotifications]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-gradient-to-r from-white/85 via-cyan-50/60 to-white/85 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30"
            aria-label={siteIdentity.headline}
          >
            {siteIdentity.acronym}
          </div>
          <div className="hidden sm:block">
            <p className="text-[0.55rem] uppercase tracking-[0.45em] text-cyan-600/70">
              {siteIdentity.eyebrow}
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {siteIdentity.headline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Badge */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <p className="text-xs text-slate-500">Audit alerts & updates</p>
                </div>
                <div className="max-h-96 overflow-y-auto p-4">
                  {pendingCount > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {pendingCount} Pending Investigation{pendingCount !== 1 ? 's' : ''}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Transaction{pendingCount !== 1 ? 's' : ''} require{pendingCount === 1 ? 's' : ''} audit review
                          </p>
                          <a
                            href="/audit/transactions"
                            className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                          >
                            Review now →
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-semibold text-slate-900">All caught up!</p>
                      <p className="mt-1 text-sm text-slate-500">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <UserCircleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">{user?.name || user?.username || "Auditor"}</span>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                      {(user?.name || user?.username)?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user?.name || user?.username || "Auditor"}</p>
                      <p className="text-xs text-slate-500">{user?.email || "auditor@example.com"}</p>
                      <p className="mt-1 text-xs font-medium text-indigo-600">{user?.role?.replace(/_/g, ' ').toUpperCase() || "AUDITOR CLERK"}</p>
                    </div>
                  </div>
                </div>

                {stats && (
                  <div className="border-b border-slate-200 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Stats</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Pending Investigations</span>
                        <span className="font-semibold text-slate-900">{stats.pendingInvestigations}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">CRL Drift</span>
                        <span className="font-semibold text-slate-900">{stats.crlDrift}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Policy Alerts</span>
                        <span className="font-semibold text-rose-600">{stats.policyAlerts}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2">
                  <button
                    onClick={() => (window.location.href = "/logout")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ClerkNavbar;
