import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { siteIdentity } from "../../constants/siteIdentity";

const getUserInitials = (name = "") => {
  const segments = name.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  }
  return (segments[0] || "PQ").slice(0, 2).toUpperCase();
};

const Navbar = () => {
  const { user } = useAuth();
  const { useNavigate } = require("react-router-dom");
  const navigate = useNavigate();
  const userInitials = getUserInitials(user?.name);
  const roleLabel = user?.role?.replace(/_/g, " ") || "secure session";
  const [sessionTimestamp, setSessionTimestamp] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimestamp(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = sessionTimestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-gradient-to-r from-white/85 via-cyan-50/60 to-white/85 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 text-base font-semibold shadow-lg rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-slate-950 shadow-cyan-500/30"
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

        <div className="flex-wrap items-center hidden gap-3 text-xs text-slate-500 sm:flex" />

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="items-center hidden gap-2 px-3 py-1 text-xs font-medium border rounded-full shadow-sm border-emerald-100 bg-emerald-50/80 text-emerald-700 sm:flex">
                <span
                  className="heartbeat-dot inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span>Active</span>
                <span className="text-slate-500">{formattedTime}</span>
              </div>
              <NavLink
                to="/profile"
                aria-label="Open profile"
                className="no-underline flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-white to-slate-100 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition hover:border-cyan-200 hover:text-cyan-800"
              >
                {userInitials}
              </NavLink>
              <button
                type="button"
                onClick={() => navigate("/logout")}
                className="rounded-full border border-slate-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition hover:border-rose-200 hover:text-rose-600"
              >
                End Session
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-500">
              Preparing secure session…
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
