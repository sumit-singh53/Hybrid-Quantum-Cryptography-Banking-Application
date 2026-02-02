import React from "react";
import { Link } from "react-router-dom";
import { siteIdentity } from "../../constants/siteIdentity";

// navAnchors removed (no longer used)

const PublicHeader = () => {
  return (
    <header className="w-full border-b border-white/70 bg-white/80 backdrop-blur">
      <div className="flex flex-col w-full gap-4 px-0 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline text-slate-900"
        >
          <div className="flex items-center justify-center w-12 h-12 text-base font-semibold text-white shadow-lg rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 shadow-cyan-500/40">
            {siteIdentity.acronym}
          </div>
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.45em] text-cyan-600/70">
              {siteIdentity.eyebrow}
            </p>
            <p className="text-base font-semibold text-slate-900">
              {siteIdentity.headline}
            </p>
          </div>
        </Link>

        {/* Navigation links removed as requested */}

        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link
            to="/login"
            className="px-4 py-2 no-underline transition border rounded-full shadow-sm border-slate-200/80 bg-white/90 text-slate-700 hover:border-cyan-200 hover:text-cyan-700"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-white no-underline transition rounded-full shadow-lg bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/40 hover:brightness-110"
          >
            Open Account
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
