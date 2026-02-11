import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentialSummary, setCredentialSummary] = useState(null);
  const [success, setSuccess] = useState("");
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
      setSuccess("Registration successful — certificate downloaded.");
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
    <div className="h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50 text-slate-900 overflow-hidden">
      <main className="flex items-center justify-center h-full px-2 py-4 mx-auto max-w-7xl md:px-8">
        <section className="flex items-center justify-center w-full">
          <div className="flex flex-col w-full max-w-4xl overflow-hidden bg-white shadow-lg rounded-xl md:flex-row md:items-stretch">
            <div className="flex items-center justify-center w-full p-4 md:w-1/2 bg-gradient-to-br from-green-600 to-green-400">
              <svg
                className="w-32 h-32 sm:w-40 sm:h-40"
                fill="none"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2"
              >
                <rect width="200" height="200" rx="32" fill="#fff" />
                <path
                  d="M40 120v-40a8 8 0 018-8h104a8 8 0 018 8v40"
                  stroke="#059669"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="60"
                  y="100"
                  width="80"
                  height="40"
                  rx="8"
                  fill="#059669"
                />
                <rect
                  x="80"
                  y="120"
                  width="40"
                  height="20"
                  rx="4"
                  fill="#fff"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-center w-full p-4 sm:p-6 md:w-1/2 overflow-y-auto max-h-screen">
              <h2 className="mb-3 text-2xl font-bold text-center text-gray-800 sm:mb-4 sm:text-3xl">
                Customer Registration
              </h2>
              <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-green-900 border border-green-200 rounded-lg shadow bg-green-50 sm:p-4 animate-fade-in">
                <span className="font-semibold">Signup Instructions:</span>
                <ul className="pl-5 mt-2 space-y-1 list-disc">
                  <li>Enter your full legal name and a valid email address.</li>
                  <li>Choose a strong password (at least 8 characters).</li>
                  <li>After signup, download and store your certificate file.</li>
                  <li>Contact support for any onboarding issues.</li>
                </ul>
              </div>
              {error && (
                <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-red-800 border border-red-200 rounded-lg sm:p-4 bg-red-50 animate-fade-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="w-full max-w-lg p-3 mx-auto mb-4 text-sm font-medium text-green-900 border border-green-200 rounded-lg sm:p-4 bg-green-50 animate-fade-in">
                  {success}
                </div>
              )}
              <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="full-name"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Full name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="e.g., Ada Lovelace"
                    required
                    className="block w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@bank-secure.com"
                    required
                    className="block w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Account password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    className="block w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 font-semibold text-white transition bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </form>
              {credentialSummary && (
                <div className="flex flex-col items-center mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 font-semibold text-green-800 transition bg-green-100 rounded-lg shadow hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    onClick={handleDownloadCertificateAgain}
                  >
                    Download certificate again
                  </button>
                </div>
              )}

              {/* Navigation Links */}
              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-green-600 hover:text-green-800 transition-colors no-underline"
                  >
                    Login here
                  </Link>
                </p>
                <p className="text-sm text-gray-600">
                  <Link
                    to="/"
                    className="font-medium text-green-600 hover:text-green-800 transition-colors no-underline inline-flex items-center gap-1 justify-center"
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

export default CustomerSignup;
