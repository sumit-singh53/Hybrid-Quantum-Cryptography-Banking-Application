import React from "react";
import { useRole } from "../../context/RoleContext";
import { ROLES } from "../../utils/roleUtils";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { role } = useRole();
  const isAdminRole = role === ROLES.SYSTEM_ADMIN;
  const isManagerRole = role === ROLES.MANAGER;

  // Manager has minimal footer
  if (isManagerRole) {
    return (
      <footer className="relative z-10 w-full border-t border-slate-200/60 bg-white/80 backdrop-blur-sm py-4 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 sm:flex-row">
            <p>© {currentYear} PQ Banking. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-slate-500">Secure Operations • Post-Quantum Protected</span>
              <span className="text-xs text-slate-400">v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`relative z-10 w-full border-t backdrop-blur-xl overflow-hidden ${
      isAdminRole
        ? 'border-slate-800/50 bg-gradient-to-br from-slate-950/95 via-indigo-950/80 to-slate-950/95 text-slate-400'
        : 'border-white/60 bg-gradient-to-br from-white/95 via-cyan-50/30 to-white/95 text-slate-500'
    }`}>
      {/* Ambient lighting effects for admin */}
      {isAdminRole && (
        <>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}

      <div className="relative w-full px-4 pt-12 pb-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Customer Footer */}
        {!isAdminRole && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* About Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-base shadow-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-white transform transition-transform hover:scale-105">
                  PQ
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">PQ Banking</p>
                  <p className="text-xs font-medium text-cyan-600 tracking-wide">SECURE & SIMPLE</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
                Your money, secured with next-generation quantum-safe technology. Banking made simple, security made stronger.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wider">Quick Links</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">Dashboard</span>
                  </a>
                </li>
                <li>
                  <a href="/transactions" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">My Transactions</span>
                  </a>
                </li>
                <li>
                  <a href="/certificates" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">Security Certificate</span>
                  </a>
                </li>
                <li>
                  <a href="/profile" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">My Profile</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wider">Need Help?</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">Help Center</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">FAQs</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 hover:translate-x-1 transition-all group">
                    <svg className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">Contact Support</span>
                  </a>
                </li>
                <li className="pt-3 border-t border-slate-200/60">
                  <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 p-3 border border-cyan-100">
                    <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Available 24/7
                    </p>
                    <a href="mailto:support@pqbanking.com" className="text-xs font-bold text-cyan-700 hover:text-cyan-800 transition-colors">
                      support@pqbanking.com
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            {/* Security Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-5 uppercase tracking-wider">Your Security</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 transition-all hover:shadow-md">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500 shadow-lg">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Bank-Grade</p>
                    <p className="text-xs text-slate-600">Military encryption</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-100 transition-all hover:shadow-md">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-cyan-500 shadow-lg">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Quantum-Safe</p>
                    <p className="text-xs text-slate-600">Future-proof tech</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Footer */}
        {isAdminRole && (
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
            {/* Left side - Branding */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl font-semibold shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  PQ
                </div>
                <div>
                  <p className="text-lg font-bold text-white">PQ Banking</p>
                  <p className="text-xs text-slate-400">Post-Quantum Secure Banking</p>
                </div>
              </div>
              <p className="text-sm max-w-md text-slate-400">
                Built with hybrid quantum-resistant cryptography for post-quantum resilience, 
                continuous auditability, and real-time trust decisions.
              </p>
            </div>

            {/* Right side - Security Badges */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Security Features
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium shadow-sm border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  PQ + RSA Dual Control
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium shadow-sm border-purple-500/30 bg-purple-500/10 text-purple-200">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Certificate Revocation List
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium shadow-sm border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Zero Trust Architecture
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Trust Indicators - Common for both */}
        <div className="grid grid-cols-1 gap-5 mb-10 sm:grid-cols-3">
          <div className={`group rounded-2xl border p-6 text-center transition-all duration-300 ${
            isAdminRole
              ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 hover:scale-105 shadow-lg'
              : 'border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30 shadow-md hover:shadow-xl hover:-translate-y-1'
          }`}>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              isAdminRole ? 'bg-indigo-500/20' : 'bg-cyan-500 shadow-lg shadow-cyan-500/30'
            }`}>
              <svg className={`h-6 w-6 ${isAdminRole ? 'text-indigo-300' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <dt className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isAdminRole ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAdminRole ? 'Hybrid Cryptography' : 'Encryption Standard'}
            </dt>
            <dd className={`text-base font-bold ${isAdminRole ? 'text-white' : 'text-slate-900'}`}>
              {isAdminRole ? 'PQ + Classical Trust' : 'Military Grade'}
            </dd>
          </div>

          <div className={`group rounded-2xl border p-6 text-center transition-all duration-300 ${
            isAdminRole
              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20 hover:scale-105 shadow-lg'
              : 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-md hover:shadow-xl hover:-translate-y-1'
          }`}>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              isAdminRole ? 'bg-purple-500/20' : 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
            }`}>
              <svg className={`h-6 w-6 ${isAdminRole ? 'text-purple-300' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <dt className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isAdminRole ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAdminRole ? 'Certificate Uptime' : 'Service Availability'}
            </dt>
            <dd className={`text-base font-bold ${isAdminRole ? 'text-white' : 'text-slate-900'}`}>
              99.997% Uptime
            </dd>
          </div>

          <div className={`group rounded-2xl border p-6 text-center transition-all duration-300 ${
            isAdminRole
              ? 'bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border-cyan-500/20 hover:scale-105 shadow-lg'
              : 'border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30 shadow-md hover:shadow-xl hover:-translate-y-1'
          }`}>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              isAdminRole ? 'bg-cyan-500/20' : 'bg-indigo-500 shadow-lg shadow-indigo-500/30'
            }`}>
              <svg className={`h-6 w-6 ${isAdminRole ? 'text-cyan-300' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <dt className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isAdminRole ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAdminRole ? 'Response Time' : 'Support Response'}
            </dt>
            <dd className={`text-base font-bold ${isAdminRole ? 'text-white' : 'text-slate-900'}`}>
              {"< 90 Seconds"}
            </dd>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`w-full pt-6 border-t ${
          isAdminRole ? 'border-slate-800/50' : 'border-slate-200/60'
        }`}>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className={`text-xs font-medium ${isAdminRole ? 'text-slate-500' : 'text-slate-600'}`}>
              © {currentYear} PQ Banking. All rights reserved. • <span className="text-cyan-600">Version 1.0.0</span>
            </p>
            <div className="flex items-center gap-4 text-xs">
              {!isAdminRole && (
                <div className="flex gap-4">
                  <a href="#" className="text-slate-600 hover:text-cyan-600 font-medium transition-colors hover:underline underline-offset-4">Privacy Policy</a>
                  <span className="text-slate-300">|</span>
                  <a href="#" className="text-slate-600 hover:text-cyan-600 font-medium transition-colors hover:underline underline-offset-4">Terms of Service</a>
                  <span className="text-slate-300">|</span>
                  <a href="#" className="text-slate-600 hover:text-cyan-600 font-medium transition-colors hover:underline underline-offset-4">Security</a>
                </div>
              )}
              {isAdminRole && (
                <span className="text-slate-500">
                  All transactions are cryptographically signed and audited
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
