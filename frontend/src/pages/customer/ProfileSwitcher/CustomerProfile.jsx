import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { fetchCustomerOverview } from "../../../services/customerService";
import QRCode from "qrcode";

const CustomerProfile = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const paymentCardRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchCustomerOverview();
        setOverview(data);
        
        // Generate QR code with payment details
        const paymentInfo = JSON.stringify({
          name: user?.full_name || user?.name,
          account: data?.accounts?.[0]?.account_number || "N/A",
          bank: "Hybrid Quantum Bank",
          type: "UPI",
        });
        
        const qrUrl = await QRCode.toDataURL(paymentInfo, {
          width: 256,
          margin: 2,
          color: {
            dark: "#4F46E5",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrUrl);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const copyAllDetails = () => {
    const details = `
═══════════════════════════════════════
  💳 PAYMENT DETAILS
═══════════════════════════════════════

Name:           ${user?.full_name || user?.name || "N/A"}
Username:       ${user?.username || "N/A"}
Account Number: ${overview?.accounts?.[0]?.account_number || "N/A"}
Email:          ${user?.email || "N/A"}
Bank:           Hybrid Quantum Bank
IFSC Code:      HQBANK0001

Certificate ID: ${user?.certificate_id || user?.certificateId || "N/A"}
User ID:        ${user?.id || "N/A"}

═══════════════════════════════════════
    Share these details to receive payments
═══════════════════════════════════════
    `.trim();
    
    copyToClipboard(details, "all");
  };

  const downloadPaymentCard = async () => {
    try {
      // Create a canvas to draw the payment card
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 500);
      gradient.addColorStop(0, "#4F46E5");
      gradient.addColorStop(1, "#06B6D4");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 500);

      // Add pattern overlay
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 800; i += 40) {
        for (let j = 0; j < 500; j += 40) {
          ctx.fillRect(i, j, 20, 20);
        }
      }

      // Bank name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px system-ui";
      ctx.fillText("HYBRID QUANTUM BANK", 50, 60);

      // QR Code
      if (qrCodeUrl) {
        const qrImg = new Image();
        qrImg.src = qrCodeUrl;
        await new Promise((resolve) => {
          qrImg.onload = () => {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(560, 140, 200, 200);
            ctx.drawImage(qrImg, 570, 150, 180, 180);
            resolve();
          };
        });
      }

      // User details
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 28px system-ui";
      ctx.fillText(user?.full_name || user?.name || "N/A", 50, 180);

      ctx.font = "18px system-ui";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(`@${user?.username || "N/A"}`, 50, 210);

      // Account details in boxes
      const drawBox = (label, value, x, y) => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(x, y, 480, 70);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "14px system-ui";
        ctx.fillText(label, x + 20, y + 25);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px monospace";
        ctx.fillText(value, x + 20, y + 52);
      };

      drawBox("ACCOUNT NUMBER", overview?.accounts?.[0]?.account_number || "N/A", 50, 250);
      drawBox("EMAIL ADDRESS", user?.email || "N/A", 50, 340);

      // Footer
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "14px system-ui";
      ctx.fillText("Scan QR code to get payment details • Secured with Quantum Cryptography", 50, 470);

      // Download
      const link = document.createElement("a");
      link.download = `payment-card-${user?.username || "user"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to generate payment card:", error);
    }
  };

  const getInitials = () => {
    const name = user?.full_name || user?.name || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberSince = () => {
    if (!overview?.accounts?.[0]?.created_at) return "N/A";
    return new Date(overview.accounts[0].created_at).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  const getTransactionCount = () => {
    return overview?.recent_transactions?.length || 0;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const accountNumber = overview?.accounts?.[0]?.account_number || "N/A";
  const balance = overview?.account_balance || 0;
  const certificateId = user?.certificate_id || user?.certificateId || "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-2 text-slate-600">
            Manage your account information and share payment details
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              {/* Profile Header */}
              <div className="flex flex-col items-center gap-6 border-b border-slate-200 pb-8 sm:flex-row">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-600 text-3xl font-bold text-white shadow-lg">
                  {getInitials()}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {user?.full_name || user?.name || "User"}
                  </h2>
                  <p className="mt-1 text-lg text-indigo-600">@{user?.username || "N/A"}</p>
                  <p className="mt-2 text-sm text-slate-600">{user?.email || "N/A"}</p>
                </div>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl"
                >
                  <svg
                    className="mr-2 inline-block h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share Details
                </button>
              </div>

              {/* Account Information Grid */}
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account Number
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono text-lg font-bold text-slate-900">{accountNumber}</p>
                    <button
                      onClick={() => copyToClipboard(accountNumber, "account")}
                      className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
                      title="Copy account number"
                    >
                      {copied === "account" ? (
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current Balance
                  </p>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    ₹{Number(balance).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User ID
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono text-sm font-medium text-slate-700">
                      {user?.id ? user.id.slice(0, 24) + "..." : "N/A"}
                    </p>
                    <button
                      onClick={() => copyToClipboard(user?.id || "", "userId")}
                      className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
                      title="Copy user ID"
                      disabled={!user?.id}
                    >
                      {copied === "userId" ? (
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Member Since
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{getMemberSince()}</p>
                </div>
              </div>
            </div>

            {/* Certificate & Security */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Security & Certificate</h3>
                  <p className="text-sm text-slate-600">Quantum-secured authentication</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Certificate ID</p>
                    <p className="mt-1 font-mono text-sm text-slate-500">
                      {certificateId && certificateId !== "N/A" ? certificateId.slice(0, 32) + "..." : "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(certificateId, "cert")}
                    className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
                  >
                    {copied === "cert" ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-semibold text-green-800">Device Binding Active</p>
                    </div>
                    <p className="mt-1 text-xs text-green-700">Your device is securely enrolled</p>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-sm font-semibold text-blue-800">PQ + RSA Encryption</p>
                    </div>
                    <p className="mt-1 text-xs text-blue-700">Post-quantum cryptography enabled</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700">Security Features</h4>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Quantum-resistant certificate attestation
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Transaction-level accountability logging
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Encrypted device binding with PQ keys
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <h3 className="mb-6 text-xl font-bold text-slate-900">Account Statistics</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{getTransactionCount()}</p>
                  <p className="mt-1 text-sm text-slate-600">Recent Transactions</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-white p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-green-600">Active</p>
                  <p className="mt-1 text-sm text-slate-600">Account Status</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{overview?.last_login?.days_since || "0"}</p>
                  <p className="mt-1 text-sm text-slate-600">Days Since Login</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - QR and Quick Actions */}
          <div className="space-y-6">
            {/* Payment QR Card */}
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-cyan-600 p-8 shadow-lg">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">Payment QR Code</h3>
                <p className="mt-2 text-sm text-indigo-100">
                  Share this QR code to receive payments
                </p>
              </div>

              {qrCodeUrl && (
                <div className="mx-auto mt-6 w-64 overflow-hidden rounded-2xl border-4 border-white bg-white p-4 shadow-xl">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="h-full w-full" />
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={downloadPaymentCard}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Payment Card
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <h3 className="mb-6 text-xl font-bold text-slate-900">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={copyAllDetails}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    {copied === "all" ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {copied === "all" ? "Copied!" : "Copy All Details"}
                    </p>
                    <p className="text-xs text-slate-600">Payment info for sharing</p>
                  </div>
                </button>

                <a
                  href="/accounts"
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">View Accounts</p>
                    <p className="text-xs text-slate-600">Complete account details</p>
                  </div>
                </a>

                <a
                  href="/security"
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Security Center</p>
                    <p className="text-xs text-slate-600">Manage device & secrets</p>
                  </div>
                </a>

                <a
                  href="/transactions"
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Transaction History</p>
                    <p className="text-xs text-slate-600">View all transactions</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Bank Information */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <h3 className="mb-6 text-xl font-bold text-slate-900">Bank Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Name</p>
                  <p className="mt-1 font-semibold text-slate-900">Hybrid Quantum Bank</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IFSC Code</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono font-semibold text-slate-900">HQBANK0001</p>
                    <button
                      onClick={() => copyToClipboard("HQBANK0001", "ifsc")}
                      className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                      {copied === "ifsc" ? (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 font-semibold text-slate-900">Main Branch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Share Payment Details</h3>
            <p className="text-slate-600 mb-8">
              Share your payment details with others to receive money
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
                {qrCodeUrl && (
                  <>
                    <img src={qrCodeUrl} alt="Payment QR" className="h-48 w-48 rounded-xl border-4 border-white shadow-lg" />
                    <p className="mt-4 text-center text-sm font-semibold text-slate-700">
                      Scan to get payment details
                    </p>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                  <p className="mt-1 font-semibold text-slate-900">{user?.full_name || user?.name || "N/A"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Number</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">{accountNumber}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IFSC Code</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">HQBANK0001</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Name</p>
                  <p className="mt-1 font-semibold text-slate-900">Hybrid Quantum Bank</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={copyAllDetails}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-600 bg-white px-6 py-3 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied === "all" ? "Copied!" : "Copy All Details"}
              </button>
              <button
                onClick={downloadPaymentCard}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
