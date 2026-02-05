import React from "react";
import { useRole } from "../../context/RoleContext";
import { ROLES } from "../../utils/roleUtils";

const signalHighlights = [
  { label: "Hybrid cryptography", value: "PQ + classical trust" },
  { label: "Certificate uptime", value: "99.997% trailing 30d" },
  { label: "Escalation SLA", value: "< 90 seconds" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { role } = useRole();
  const isAdminRole = role === ROLES.SYSTEM_ADMIN;

  return (
    <footer className={`relative z-10 w-full border-t backdrop-blur-xl overflow-hidden ${
      isAdminRole
        ? 'border-slate-800/50 bg-gradient-to-br from-slate-950/95 via-indigo-950/80 to-slate-950/95 text-slate-400'
        : 'border-white/60 bg-gradient-to-br from-white/95 via-slate-50/80 to-white/95 text-slate-500'
    }`}>
      {/* Ambient lighting effects for admin */}
      {isAdminRole && (
        <>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}

      <div className="relative w-full px-4 pt-8 pb-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-[220px] flex-1">
            <p className={`text-xs uppercase tracking-[0.4em] text-center md:text-left ${
              isAdminRole ? 'text-indigo-400/70' : 'text-cyan-600/70'
            }`}>
              Secure operations center
            </p>
            <p className={`mt-2 text-xl font-semibold text-center md:text-left ${
              isAdminRole ? 'text-white' : 'text-slate-900'
            }`}>
              Hybrid-Quantum Cryptography Banking System
            </p>
            <p className={`mt-1 text-sm text-center md:text-left ${
              isAdminRole ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Built for post-quantum resilience, continuous auditability, and
              real-time trust decisions.
            </p>
          </div>
          <div className={`flex flex-wrap justify-center gap-2 text-xs md:justify-end ${
            isAdminRole ? 'text-slate-300' : 'text-slate-500'
          }`}>
            <span className={`px-3 py-2 mb-2 tracking-widest border rounded-full shadow-sm md:mb-0 ${
              isAdminRole
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'
                : 'border-white/70 bg-white/80'
            }`}>
              PQ + RSA DUAL CONTROL
            </span>
            <span className={`px-3 py-2 mb-2 tracking-widest border rounded-full shadow-sm md:mb-0 ${
              isAdminRole
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-200'
                : 'border-white/70 bg-white/80'
            }`}>
              CRL LIVE SYNC
            </span>
            <span className={`px-3 py-2 tracking-widest border rounded-full shadow-sm ${
              isAdminRole
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                : 'border-white/70 bg-white/80'
            }`}>
              ZERO TRUST LEDGER
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 mt-8 sm:grid-cols-2 md:grid-cols-3">
          {signalHighlights.map((item, index) => {
            const gradients = isAdminRole
              ? [
                  'from-indigo-500/10 to-purple-500/5 border-indigo-500/20',
                  'from-purple-500/10 to-pink-500/5 border-purple-500/20',
                  'from-cyan-500/10 to-indigo-500/5 border-cyan-500/20'
                ]
              : ['border-white/70 bg-white/80', 'border-white/70 bg-white/80', 'border-white/70 bg-white/80'];
            
            return (
              <div
                key={item.label}
                className={`rounded-3xl border p-4 flex flex-col items-center justify-center transition-all duration-300 ${
                  isAdminRole
                    ? `bg-gradient-to-br ${gradients[index]} backdrop-blur-sm hover:scale-105 shadow-lg shadow-indigo-500/5`
                    : `${gradients[index]} shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:shadow-xl`
                }`}
              >
                <dt className={`text-xs tracking-widest text-center uppercase ${
                  isAdminRole ? 'text-slate-400' : 'text-slate-400'
                }`}>
                  {item.label}
                </dt>
                <dd className={`mt-2 text-base font-semibold text-center ${
                  isAdminRole ? 'text-white' : 'text-slate-900'
                }`}>
                  {item.value}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className={`w-full mt-8 py-4 border-t text-xs text-center ${
          isAdminRole ? 'border-slate-800/50 text-slate-500' : 'border-white/40 text-slate-400'
        }`}>
          <p>
            © {currentYear} PQ Banking • All audit interactions are logged and
            cryptographically signed.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
