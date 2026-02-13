import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import bankVisual from "../../assets/images/bank.png";

const Login = () => {
  const navigate = useNavigate();
  const { loginWithCertificate } = useAuth();
  const toast = useToast();

  const [certificateFile, setCertificateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [manualDeviceSecret, setManualDeviceSecret] = useState("");
  const [showRecoveryFields, setShowRecoveryFields] = useState(false);
  const [loginStage, setLoginStage] = useState("form"); // form, processing, success
  const [statusMessage, setStatusMessage] = useState("");
  const [redirectPath, setRedirectPath] = useState("");

  // Animation effect - similar to Logout
  useEffect(() => {
    if (loginStage === "processing" && redirectPath) {
      const performLoginAnimation = async () => {
        try {
          // Stage 1: Show processing animation
          setStatusMessage("Signing you in securely...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Stage 2: Verifying credentials
          setStatusMessage("Verifying credentials...");
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          // Stage 3: Show success animation
          setLoginStage("success");
          setStatusMessage("Authentication successful");
          await new Promise(resolve => setTimeout(resolve, 2500));
          
          // Redirect with page reload
          window.location.href = redirectPath;
        } catch (error) {
          console.error("Animation error:", error);
          window.location.href = redirectPath;
        }
      };

      performLoginAnimation();
    }
  }, [loginStage, redirectPath]);

  const handleCertificateChange = (event) => {
    setCertificateFile(event.target.files?.[0] || null);
  };

  const handlePrivateKeyChange = (event) => {
    setPrivateKeyFile(event.target.files?.[0] || null);
  };

  const toggleRecoveryFields = () => {
    setShowRecoveryFields((prev) => !prev);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!certificateFile) {
      toast.error("Please upload your certificate file (.pem) to login.");
      return;
    }

    try {
      setLoading(true);

      const user = await loginWithCertificate({
        certificateFile,
        privateKeyFile,
        manualDeviceSecret: manualDeviceSecret.trim(),
      });

      if (!user || !user.role) {
        throw new Error("Certificate missing role information");
      }

      // Determine redirect path based on role
      let targetPath = "/dashboard";
      switch (user.role) {
        case "customer":
        case "auditor_clerk":
          targetPath = "/dashboard";
          break;
        case "manager":
          targetPath = "/manager/dashboard";
          break;
        case "system_admin":
          targetPath = "/admin/dashboard";
          break;
        default:
          toast.error("Unknown user role. Please contact support.");
          setLoading(false);
          return;
      }

      setRedirectPath(targetPath);

      // Stage 1: Show processing animation
      setLoginStage("processing");
      setStatusMessage("Signing you in securely...");
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Stage 2: Verifying credentials
      setStatusMessage("Verifying credentials...");
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Stage 3: Show success animation
      setLoginStage("success");
      setStatusMessage("Authentication successful");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect with page reload
      window.location.href = targetPath;

      setPrivateKeyFile(null);
      setManualDeviceSecret("");
      setShowRecoveryFields(false);
    } catch (err) {
      setLoginStage("form");
      setLoading(false);
      console.error("[LOGIN] Login failed:", err);
      console.error("[LOGIN] Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // Show detailed error message
      const errorMessage = err.message || "Login failed. Please check your certificate and try again.";
      toast.error(errorMessage);
    }
  };

  // Processing Stage - Full screen overlay with spinner
  if (loginStage === "processing") {
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
            Please wait while we authenticate your credentials...
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
        
        <style jsx>{`
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
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
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
          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
        `}</style>
      </div>
    );
  }
  
  // Success Stage - Checkmark animation
  if (loginStage === "success") {
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
            Redirecting to your dashboard...
          </p>
        </div>
        
        <style jsx>{`
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50 text-slate-900">
      <main className="flex flex-col gap-16 px-2 py-8 mx-auto max-w-7xl md:px-8 md:py-12 lg:py-10">
        <section className="flex items-center justify-center flex-1">
          <div className="flex flex-col w-full max-w-4xl overflow-hidden bg-white shadow-lg rounded-xl md:flex-row md:items-stretch">
            <div className="flex items-center justify-center w-full p-6 sm:p-8 md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-400">
              <img
                src={bankVisual}
                alt="Modern banking headquarters"
                className="object-contain w-40 h-40 sm:w-64 sm:h-64 drop-shadow-xl"
              />
            </div>
            <div className="flex flex-col justify-center w-full p-1 sm:p-8 md:w-1/2">
              <h2 className="mb-4 text-2xl font-bold text-center text-gray-800 sm:mb-6 sm:text-3xl">
                Certificate Login
              </h2>
              <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-blue-900 border border-blue-200 rounded-lg shadow bg-blue-50 sm:p-4 animate-fade-in">
                <span className="font-semibold">Login Instructions:</span>
                <ul className="pl-5 mt-2 space-y-1 list-disc">
                  <li>
                    Upload your official certificate file (.pem) to
                    authenticate.
                  </li>
                  <li>
                    <strong>First time on this device?</strong> Click "Need to re-enroll secure keys?" and provide your private key + device secret.
                  </li>
                  <li>Never share your certificate or password with anyone.</li>
                  <li>
                    If you lose your certificate, contact PQ Banking support
                    immediately.
                  </li>
                  <li>
                    All login attempts are securely logged and monitored for
                    your safety.
                  </li>
                </ul>
              </div>
              <form className="space-y-4 sm:space-y-6" onSubmit={handleLogin}>
                <div>
                  <label
                    htmlFor="certificate"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Certificate file (.pem)
                  </label>
                  <input
                    id="certificate"
                    type="file"
                    accept=".pem"
                    onChange={handleCertificateChange}
                    className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="p-3 border border-dashed rounded-lg border-blue-200/80 bg-blue-50/50">
                  <button
                    type="button"
                    onClick={toggleRecoveryFields}
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {showRecoveryFields
                      ? "Hide secure re-enrollment inputs"
                      : "Need to re-enroll secure keys?"}
                  </button>
                  {showRecoveryFields && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="privateKeyFile"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Private key file (.pem)
                        </label>
                        <input
                          id="privateKeyFile"
                          type="file"
                          accept=".pem"
                          onChange={handlePrivateKeyChange}
                          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {privateKeyFile?.name && (
                          <p className="mt-1 text-xs text-gray-500">
                            Selected: {privateKeyFile.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="deviceSecret"
                          className="block mb-1 text-sm font-medium text-gray-700"
                        >
                          Device secret (from onboarding kit)
                        </label>
                        <input
                          id="deviceSecret"
                          type="text"
                          value={manualDeviceSecret}
                          onChange={(e) => setManualDeviceSecret(e.target.value)}
                          placeholder="Enter device secret"
                          className="block w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          This stays on your device only. It allows the browser
                          to recreate secure bindings after hardware changes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 font-semibold text-white transition bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              {/* Navigation Links */}
              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-blue-600 hover:text-blue-800 transition-colors no-underline"
                  >
                    Sign up here
                  </Link>
                </p>
                <p className="text-sm text-gray-600">
                  <Link
                    to="/"
                    className="font-medium text-blue-600 hover:text-blue-800 transition-colors no-underline inline-flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Back to Home
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
