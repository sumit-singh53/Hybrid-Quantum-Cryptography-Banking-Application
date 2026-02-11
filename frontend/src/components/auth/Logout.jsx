import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../../services/authService";

const Logout = ({ message = "You have been logged out." }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoutStage, setLogoutStage] = useState("processing"); // processing, success, complete
  const [statusMessage, setStatusMessage] = useState("Signing you out securely...");
  
  useEffect(() => {
    const performLogout = async () => {
      try {
        // Stage 1: Show processing animation (EXTENDED)
        setLogoutStage("processing");
        setStatusMessage("Signing you out securely...");
        
        // Wait longer to show spinner animation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Call backend logout API (if available)
        try {
          await logoutUser();
        } catch (apiError) {
          console.warn("Backend logout call failed (non-critical):", apiError);
        }
        
        // Stage 2: Clear local auth state (EXTENDED)
        await new Promise(resolve => setTimeout(resolve, 1200));
        setStatusMessage("Clearing session data...");
        
        logout(); // Clear localStorage, sessionStorage, and auth context
        
        // Wait to show clearing message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 3: Show success animation (EXTENDED)
        setLogoutStage("success");
        setStatusMessage("Session secured successfully");
        
        // Wait longer to show checkmark animation
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Stage 4: Complete and show final UI
        setLogoutStage("complete");
        
      } catch (error) {
        console.error("Logout error:", error);
        // Even on error, clear local state for security
        logout();
        setLogoutStage("complete");
      }
    };

    performLogout();
    
    // Prevent back navigation after logout
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };
    
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBack);
    
    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, [logout]);

  // Processing Stage - Full screen overlay with spinner
  if (logoutStage === "processing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-cyan-50 to-blue-50 animate-fade-in">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slower"></div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10 text-center px-4">
          {/* Animated spinner */}
          <div className="inline-block mb-8 relative">
            <div className="w-24 h-24 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-r-blue-500 rounded-full animate-spin-reverse"></div>
          </div>
          
          {/* Status message */}
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3 animate-pulse">
            {statusMessage}
          </h2>
          <p className="text-slate-600 text-sm md:text-base">
            Please wait while we secure your session...
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Success Stage - Checkmark animation
  if (logoutStage === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 animate-fade-in">
        <div className="relative z-10 text-center px-4">
          {/* Animated checkmark */}
          <div className="inline-block mb-6 relative">
            <svg className="w-32 h-32 animate-scale-in" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="url(#successGradient)"
                className="drop-shadow-2xl animate-scale-in"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="283"
                strokeDashoffset="0"
                className="animate-draw-circle"
              />
              <path
                d="M30 50 L42 62 L70 34"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="60"
                strokeDashoffset="0"
                className="animate-draw-check"
              />
              <defs>
                <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3 animate-fade-in-up">
            {statusMessage}
          </h2>
          <p className="text-slate-600 text-lg animate-fade-in-up" style={{animationDelay: '200ms'}}>
            Your credentials have been safely cleared
          </p>
        </div>
      </div>
    );
  }
  
  // Complete Stage - Final landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 relative overflow-hidden animate-fade-in">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="px-4 py-6 mx-auto max-w-7xl w-full md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 text-base font-semibold text-white shadow-lg">
              PQ
            </div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cyan-700 font-semibold">
                Hybrid Banking
              </p>
              <p className="text-sm font-bold text-slate-800">
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
              {/* Animated Checkmark Circle */}
              <div className="inline-block mb-6 relative">
                <svg className="w-28 h-28" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="url(#finalSuccessGradient)"
                    className="drop-shadow-2xl"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeDasharray="283"
                    strokeDashoffset="0"
                  />
                  <path
                    d="M30 50 L42 62 L70 34"
                    fill="none"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="finalSuccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-slate-800 via-blue-700 to-slate-800 bg-clip-text text-transparent">
                Session Secured
              </h1>
              <p className="text-xl text-slate-700 mb-2 font-medium">{message}</p>
              <p className="text-sm text-slate-500">Your credentials have been safely cleared from this device</p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-in-up" style={{animationDelay: '400ms'}}>
              {/* Login Card */}
              <button
                onClick={() => navigate("/login")}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                aria-label="Navigate to login page"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Access Your Account</h3>
                  <p className="text-cyan-50/90 mb-4 text-sm leading-relaxed">Sign in with your quantum-safe certificate to resume banking operations</p>
                  <div className="flex items-center text-white font-semibold">
                    <span>Continue to Login</span>
                    <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Home Card */}
              <button
                onClick={() => navigate("/")}
                className="group relative overflow-hidden rounded-3xl bg-white border-2 border-slate-200 p-8 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-slate-300 active:scale-[0.98]"
                aria-label="Navigate to homepage"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 to-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-slate-100 group-hover:bg-slate-200 transition-all duration-300 group-hover:scale-110">
                    <svg className="w-7 h-7 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Explore PQ Banking</h3>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">Learn about our quantum-safe infrastructure and security features</p>
                  <div className="flex items-center text-slate-700 font-semibold">
                    <span>Visit Homepage</span>
                    <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {/* Security Features Grid */}
            <div className="grid md:grid-cols-3 gap-5 mb-10 animate-fade-in-up" style={{animationDelay: '800ms'}}>
              <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-2">Hybrid Cryptography</h4>
                <p className="text-sm text-slate-600">PQ + RSA Dual Control</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-2">Certificate Status</h4>
                <p className="text-sm text-slate-600">99.997% Uptime</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-2">Response Time</h4>
                <p className="text-sm text-slate-600">&lt; 90 Seconds SLA</p>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in-up" style={{animationDelay: '1200ms'}}>
              <span className="px-5 py-2.5 text-xs font-bold tracking-wider text-slate-700 bg-white border-2 border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                🔒 CRL LIVE SYNC
              </span>
              <span className="px-5 py-2.5 text-xs font-bold tracking-wider text-slate-700 bg-white border-2 border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                🛡️ ZERO TRUST LEDGER
              </span>
              <span className="px-5 py-2.5 text-xs font-bold tracking-wider text-slate-700 bg-white border-2 border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                ⚛️ QUANTUM-SAFE
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-6 text-center">
          <p className="text-sm text-slate-600 font-medium">
            © {new Date().getFullYear()} PQ Banking • All audit interactions are logged and cryptographically signed
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 30px) scale(0.9); }
          66% { transform: translate(20px, -20px) scale(1.1); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes draw-circle {
          from { stroke-dashoffset: 283; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes draw-check {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.08); }
        }

        .animate-float {
          animation: float 12s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 15s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.8s ease-out;
        }

        .animate-draw-circle {
          animation: draw-circle 1.5s ease-out;
        }

        .animate-draw-check {
          animation: draw-check 1s ease-out 1s;
        }

        .animate-spin-reverse {
          animation: spin-reverse 2s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }

        .animate-pulse-slower {
          animation: pulse-slower 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Logout;
