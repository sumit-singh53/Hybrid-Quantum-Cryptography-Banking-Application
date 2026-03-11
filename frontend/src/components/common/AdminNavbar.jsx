import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { siteIdentity } from "../../constants/siteIdentity";
import { getCurrentBreadcrumb } from "../../utils/navigationHelper";
import "./AdminNavbar.css";

const AdminNavbar = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(() => getCurrentBreadcrumb());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for custom navigation events (when user clicks links)
  useEffect(() => {
    const handleNavigation = (event) => {
      if (event.detail && event.detail.pageName) {
        setCurrentPage(event.detail.pageName);
      }
    };

    window.addEventListener('adminNavigation', handleNavigation);

    return () => {
      window.removeEventListener('adminNavigation', handleNavigation);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-gradient-to-r shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 border-white/60 from-white/85 via-cyan-50/60 to-white/85 text-slate-900 dark:border-slate-800/60 dark:from-slate-950/85 dark:via-slate-900/60 dark:to-slate-950/85 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo and Site Info (No Breadcrumb) */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/30"
            aria-label={siteIdentity.headline}
          >
            {siteIdentity.acronym}
          </div>
          <div className="hidden sm:block max-w-[180px]">
            <p className="text-[0.45rem] uppercase tracking-[0.3em] text-cyan-600/70 dark:text-cyan-400/70 truncate leading-tight">
              {siteIdentity.eyebrow}
            </p>
            <p className="text-[0.7rem] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
              {siteIdentity.headline}
            </p>
          </div>
        </div>

        {/* Right: Time, User Info, Logout */}
        <div className="flex items-center gap-4">
          {/* Time Display */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums">{formatTime(currentTime)}</span>
          </div>

          {/* Animated Pulse Indicator (No Text) */}
          <div className="hidden md:flex items-center gap-2 rounded-full border px-2 py-1.5 border-emerald-300/40 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/30">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
          </div>

          {/* User Role Badge */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <div className="rounded-full border px-3 py-1.5 border-indigo-300/40 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-950/30">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {user.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => (window.location.href = "/logout")}
            className="rounded-full border px-4 py-2 text-sm font-semibold shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition hover:border-rose-300 hover:text-rose-600 border-slate-200/70 bg-white/90 text-slate-700 dark:border-slate-700/70 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:text-rose-400"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
