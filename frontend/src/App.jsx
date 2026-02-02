import React from "react";
import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./context/AuthContext";

const App = () => {
  const { isVerifyingSession } = useAuth();

  // Jab tak auth state resolve na ho (cert/session check)
  if (isVerifyingSession) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen transition-all duration-700 bg-gradient-to-br from-white via-slate-50 to-cyan-50 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center gap-6 p-8 border shadow-2xl rounded-3xl bg-white/90 border-cyan-100">
          <svg
            className="w-16 h-16 text-blue-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              d="M4 12a8 8 0 018-8"
              className="opacity-75"
            />
          </svg>
          <h3 className="text-2xl font-extrabold text-slate-800 animate-pulse">
            Loading Secure Banking System...
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-center text-slate-500">
            <li className="transition-all duration-700 animate-fade-in">
              • Quantum-safe authentication
            </li>
            <li className="transition-all duration-700 delay-100 animate-fade-in">
              • Real-time certificate validation
            </li>
            <li className="transition-all duration-700 delay-200 animate-fade-in">
              • End-to-end encrypted session
            </li>
            <li className="transition-all duration-700 delay-300 animate-fade-in">
              • Continuous audit logging
            </li>
            <li className="transition-all duration-700 animate-fade-in delay-400">
              • Secure role-based access
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
};

export default App;
