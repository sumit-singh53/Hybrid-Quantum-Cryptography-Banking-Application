import React from "react";

const signalHighlights = [
  { label: "Hybrid cryptography", value: "PQ + classical trust" },
  { label: "Certificate uptime", value: "99.997% trailing 30d" },
  { label: "Escalation SLA", value: "< 90 seconds" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-white/60 bg-gradient-to-br from-white/95 via-slate-50/80 to-white/95 text-slate-500 backdrop-blur">
      <div className="w-full px-4 pt-8 pb-0 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-[220px] flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-600/70 text-center md:text-left">
              Secure operations center
            </p>
            <p className="mt-2 text-xl font-semibold text-center text-slate-900 md:text-left">
              Hybrid-Quantum Cryptography Banking System
            </p>
            <p className="mt-1 text-sm text-center text-slate-500 md:text-left">
              Built for post-quantum resilience, continuous auditability, and
              real-time trust decisions.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs md:justify-end text-slate-500">
            <span className="px-3 py-2 mb-2 tracking-widest border rounded-full shadow-sm border-white/70 bg-white/80 md:mb-0">
              PQ + RSA DUAL CONTROL
            </span>
            <span className="px-3 py-2 mb-2 tracking-widest border rounded-full shadow-sm border-white/70 bg-white/80 md:mb-0">
              CRL LIVE SYNC
            </span>
            <span className="px-3 py-2 tracking-widest border rounded-full shadow-sm border-white/70 bg-white/80">
              ZERO TRUST LEDGER
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 mt-8 sm:grid-cols-2 md:grid-cols-3">
          {signalHighlights.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/70 bg-white/80 p-4 text-slate-600 shadow-[0_20px_40px_rgba(15,23,42,0.08)] flex flex-col items-center justify-center"
            >
              <dt className="text-xs tracking-widest text-center uppercase text-slate-400">
                {item.label}
              </dt>
              <dd className="mt-2 text-base font-semibold text-center text-slate-900">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="w-full mt-8 text-xs text-center text-slate-400">
          © {currentYear} PQ Banking • All audit interactions are logged and
          cryptographically signed.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
