import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Logout = ({ message = "You have been logged out." }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="px-4 py-6 mx-auto max-w-7xl md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-base font-semibold text-slate-950 shadow-lg">
              PQ
            </div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cyan-300/80">
                Hybrid Banking
              </p>
              <p className="text-sm font-semibold text-white">
                Post-Quantum Control Plane
              </p>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-5xl w-full mx-auto">
            {/* Success Icon & Message */}
            <div className="text-center mb-12 animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-500/50">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                Session Secured
              </h1>
              <p className="text-xl text-cyan-100 mb-2">{message}</p>
              <p className="text-sm text-cyan-300/60">Your credentials have been safely cleared from this device</p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {/* Login Card */}
              <button
                onClick={() => navigate("/login")}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 p-8 text-left shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/50"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white/20 backdrop-blur">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Access Your Account</h3>
                  <p className="text-cyan-50 mb-4">Sign in with your quantum-safe certificate to resume banking operations</p>
                  <div className="flex items-center text-white font-semibold">
                    <span>Continue to Login</span>
                    <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              {/* Home Card */}
              <button
                onClick={() => navigate("/")}
                className="group relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-white/20 p-8 text-left shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white/20 backdrop-blur">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Explore PQ Banking</h3>
                  <p className="text-cyan-100 mb-4">Learn about our quantum-safe infrastructure and security features</p>
                  <div className="flex items-center text-white font-semibold">
                    <span>Visit Homepage</span>
                    <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>

            {/* Security Features Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Hybrid Cryptography</h4>
                <p className="text-xs text-cyan-200">PQ + RSA Dual Control</p>
              </div>

              <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Certificate Status</h4>
                <p className="text-xs text-cyan-200">99.997% Uptime</p>
              </div>

              <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Response Time</h4>
                <p className="text-xs text-cyan-200">&lt; 90 Seconds SLA</p>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="px-4 py-2 text-xs font-medium tracking-wider text-cyan-100 bg-white/10 backdrop-blur border border-white/20 rounded-full">
                CRL LIVE SYNC
              </span>
              <span className="px-4 py-2 text-xs font-medium tracking-wider text-cyan-100 bg-white/10 backdrop-blur border border-white/20 rounded-full">
                ZERO TRUST LEDGER
              </span>
              <span className="px-4 py-2 text-xs font-medium tracking-wider text-cyan-100 bg-white/10 backdrop-blur border border-white/20 rounded-full">
                QUANTUM-SAFE INFRASTRUCTURE
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-6 text-center">
          <p className="text-sm text-cyan-300/60">
            © {new Date().getFullYear()} PQ Banking • All audit interactions are logged and cryptographically signed
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Logout;
