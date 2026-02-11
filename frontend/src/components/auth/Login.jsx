import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import bankVisual from "../../assets/images/bank.png";

const Login = () => {
  const navigate = useNavigate();
  const { loginWithCertificate } = useAuth();

  const [certificateFile, setCertificateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [manualDeviceSecret, setManualDeviceSecret] = useState("");
  const [showRecoveryFields, setShowRecoveryFields] = useState(false);

  // ...existing code...

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
    setError("");

    if (!certificateFile) {
      setError("Please upload your certificate file (.pem) to login.");
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

      switch (user.role) {
        case "customer":
        case "auditor_clerk":
          setSuccess("Login successful — redirecting…");
          setTimeout(() => navigate("/dashboard"), 700);
          break;
        case "manager":
          setSuccess("Login successful — redirecting…");
          setTimeout(() => navigate("/manager/dashboard"), 700);
          break;
        case "system_admin":
          setSuccess("Login successful — redirecting…");
          setTimeout(() => navigate("/admin/dashboard"), 700);
          break;
        default:
          setError("Unknown user role. Please contact support.");
          return;
      }

      setPrivateKeyFile(null);
      setManualDeviceSecret("");
      setShowRecoveryFields(false);
    } catch (err) {
      setError(
        err.message ||
          "Login failed. Please check your certificate and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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
                  <li>Never share your certificate or password with anyone.</li>
                  <li>
                    If you lose your certificate, contact PQ Banking support
                    immediately.
                  </li>
                  <li>
                    Re-enrolling? Provide the private key (.pem) and device
                    secret you received during onboarding.
                  </li>
                  <li>
                    All login attempts are securely logged and monitored for
                    your safety.
                  </li>
                </ul>
              </div>
              {error && (
                <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-red-800 border border-red-200 rounded-lg sm:p-4 bg-red-50 animate-fade-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-blue-900 border border-blue-200 rounded-lg sm:p-4 bg-blue-50 animate-fade-in">
                  {success}
                </div>
              )}
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
