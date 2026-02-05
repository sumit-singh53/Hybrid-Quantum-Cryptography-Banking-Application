import React from "react";
import { siteIdentity } from "../../constants/siteIdentity";

const AdminNavbar = () => (
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
      <button
        type="button"
        onClick={() => (window.location.href = "/logout")}
        className="rounded-full border border-slate-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition hover:border-rose-200 hover:text-rose-600"
      >
        Logout
      </button>
    </div>
  </header>
);

export default AdminNavbar;
