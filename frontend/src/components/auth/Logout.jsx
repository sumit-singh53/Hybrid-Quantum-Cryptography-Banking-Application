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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center min-h-screen bg-gray-900 bg-opacity-60">
      <div className="z-[99999] flex flex-col items-center justify-center w-full max-w-md px-8 py-10 mx-auto transition-all duration-700 ease-in-out scale-100 translate-y-0 bg-white shadow-2xl opacity-100 rounded-xl">
        <svg
          className="w-16 h-16 mb-4 text-blue-600 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <h2 className="mb-2 text-2xl font-bold text-center text-gray-800">
          Logout Successful
        </h2>
        <p className="mb-2 text-center text-gray-600">{message}</p>
        <span className="mb-4 text-xs text-gray-400">
          Redirecting to login...
        </span>
        <div className="flex flex-col w-full gap-2 mt-2">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full px-4 py-2 font-semibold text-white transition bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Re-login
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full px-4 py-2 font-semibold text-blue-700 transition bg-blue-100 rounded-lg shadow hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;
