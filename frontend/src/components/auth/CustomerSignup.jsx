import React, { useState } from "react";
// import { Link } from "react-router-dom";
import { sha3_256 } from "js-sha3";
import api from "../../services/api";
import {
  enrollPlatformKey,
  generateClientKeyPair,
} from "../../utils/platformKeystore";

const INITIAL_FORM = {
  full_name: "",
  email: "",
  password: "",
};

// SIGNUP_STAGES removed (unused)

const hexToBytes = (hex) => {
  if (!hex || typeof hex !== "string") {
    return new Uint8Array();
  }
  const normalized = hex.replace(/[^0-9a-f]/gi, "");
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

const base64ToBytes = (value) => {
  if (!value) {
    return new Uint8Array();
  }
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const concatUint8Arrays = (...arrays) => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  return merged;
};

const deriveDeliveryKey = (kyberCrystalB64, password, certificateId) => {
  if (!kyberCrystalB64 || !password || !certificateId) {
    throw new Error("Delivery bundle missing key derivation materials");
  }
  const encoder = new TextEncoder();
  const kyberBytes = base64ToBytes(kyberCrystalB64);
  const passwordBytes = encoder.encode(password);
  const idBytes = encoder.encode(certificateId);
  const material = concatUint8Arrays(kyberBytes, passwordBytes, idBytes);
  const hash = sha3_256.create();
  hash.update(material);
  const digestHex = hash.hex();
  return hexToBytes(digestHex);
};

const decryptDeliveryBundle = async (
  delivery,
  kyberCrystalB64,
  password,
  certificateId,
) => {
  if (!delivery?.ciphertext || !delivery?.nonce) {
    throw new Error("Encrypted delivery bundle is incomplete");
  }
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto APIs are unavailable in this browser");
  }
  const keyMaterial = deriveDeliveryKey(
    kyberCrystalB64,
    password,
    certificateId,
  );
  const aesKey = await subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const ciphertext = base64ToBytes(delivery.ciphertext);
  const nonce = base64ToBytes(delivery.nonce);
  const plaintextBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    ciphertext,
  );
  return new TextDecoder().decode(plaintextBuffer);
};

const sanitizeCertificateId = (value) => {
  const fallback = value || "customer";
  return fallback.replace(/[^a-z0-9_-]/gi, "-");
};

const downloadCertificateFile = ({ certificateText, certificateId }) => {
  if (!certificateText) {
    throw new Error("Certificate payload is unavailable for download");
  }
  const sanitizedId = sanitizeCertificateId(certificateId);
  const blob = new Blob([certificateText], {
    type: "application/x-pem-file",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `certificate_${sanitizedId}.pem`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const CustomerSignup = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentialSummary, setCredentialSummary] = useState(null);
  const [signupStage, setSignupStage] = useState("idle");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (signupStage !== "idle") {
      setSignupStage("idle");
    }
  };

  const handleDownloadCertificateAgain = () => {
    if (!credentialSummary) {
      return;
    }
    downloadCertificateFile(credentialSummary);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCredentialSummary(null);
    setSignupStage("generating-key");

    const normalizedName = form.full_name.trim();
    const normalizedEmail = form.email.trim();
    const normalizedPassword = form.password.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      setError("Please fill in all fields to register.");
      return;
    }
    if (normalizedName.length < 3) {
      setError("Full name must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(normalizedName)) {
      setError("Name can only contain letters, spaces, and basic punctuation (. ' -).");
      return;
    }
    if (normalizedPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);

      const { privateKey, publicKeySpkiB64 } = await generateClientKeyPair();

      setSignupStage("sending-request");

      const registrationPayload = {
        full_name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
        client_public_keys: {
          rsa_spki: publicKeySpkiB64,
        },
      };

      const response = await api.post("/auth/register", registrationPayload);

      const { delivery, certificate_id, kyber_crystal, device_secret } =
        response.data;
      const trimmedKyberCrystal = (kyber_crystal || "").trim();
      if (!trimmedKyberCrystal) {
        throw new Error("Bank CA did not return a Kyber Crystal secret.");
      }
      const trimmedDeviceSecret = (device_secret || "").trim();
      if (!trimmedDeviceSecret) {
        throw new Error(
          "Device secret missing from enrollment. Contact system administrator.",
        );
      }

      setSignupStage("decrypting-bundle");

      const certificateText = await decryptDeliveryBundle(
        delivery,
        trimmedKyberCrystal,
        normalizedPassword,
        certificate_id,
      );

      try {
        setSignupStage("enrolling-key");
        await enrollPlatformKey(certificate_id, privateKey, {
          deviceSecret: trimmedDeviceSecret,
        });
      } catch (keystoreError) {
        console.error("Secure key enrollment failed", keystoreError);
        throw new Error(
          keystoreError.message ||
            "Secure keystore unavailable. Use a hardened browser or device.",
        );
      }

      setSignupStage("vaulting");
      downloadCertificateFile({
        certificateText,
        certificateId: certificate_id,
      });

      setCredentialSummary({
        certificateText,
        certificateId: certificate_id,
        fullName: normalizedName,
      });
      setForm(INITIAL_FORM);
    } catch (err) {
      setSignupStage("blocked");
      setError(
        err.message ||
          "Signup failed. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-indigo-50/20 text-slate-900">
      <main className="flex flex-col gap-16 px-4 py-12 mx-auto max-w-7xl lg:py-20">
        <section className="flex items-center justify-center flex-1">
          <div className="w-full max-w-6xl">
            {/* Modern Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 mb-6 shadow-xl shadow-cyan-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Create Your Account</h1>
              <p className="text-lg text-slate-600">Join our quantum-safe banking platform with hybrid cryptography</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left: Info Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Bank-Grade Security</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Your account is protected with quantum-resistant ML-KEM encryption combined with traditional RSA security.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Digital Certificate</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        After registration, you'll receive a unique digital certificate that proves your identity for all transactions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Device Binding</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Your account is securely bound to this device, preventing unauthorized access from other locations.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold mb-1">Important:</p>
                        <p>Save your certificate file immediately after registration. You'll need it to log in and perform transactions.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Registration Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Form</h2>
                <p className="text-slate-600 mb-6">Fill in your details to get started</p>
                
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-6 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-rose-800">{error}</p>
                  </div>
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="full-name"
                    className="block mb-2 text-sm font-semibold text-slate-700"
                  >
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full legal name"
                    required
                    className="block w-full px-4 py-3 text-sm text-slate-900 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-semibold text-slate-700"
                  >
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                    className="block w-full px-4 py-3 text-sm text-slate-900 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block mb-2 text-sm font-semibold text-slate-700"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    required
                    className="block w-full px-4 py-3 text-sm text-slate-900 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                  <p className="mt-2 text-xs text-slate-500">Must be at least 8 characters with letters and numbers</p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-cyan-500/30 transition-all hover:shadow-2xl hover:shadow-cyan-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Your Account..." : "Create Account"}
                </button>
              </form>
              {credentialSummary && (
                <div className="flex flex-col items-center mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 font-semibold text-green-800 transition bg-green-100 rounded-lg shadow hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    onClick={handleDownloadCertificateAgain}
                  >
                    Download certificate again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  );
};

export default CustomerSignup;
