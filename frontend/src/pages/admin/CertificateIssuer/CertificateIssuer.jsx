import React, { useCallback, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import systemAdminService from "../../../services/systemAdminService";
import "./CertificateIssuer.css";

const MANAGED_ROLE_FILTER = "customer,auditor_clerk,manager";
const DEFAULT_VALIDITY = 60;
const RSA_KEY_PARAMS = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 3072,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: { name: "SHA-256" },
};

const chunkString = (value, size = 64) => {
  if (!value) {
    return "";
  }
  return value.match(new RegExp(`.{1,${size}}`, "g")).join("\n");
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const exportPrivateKeyPem = async (privateKey) => {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto APIs are unavailable in this browser");
  }
  const pkcs8 = await subtle.exportKey("pkcs8", privateKey);
  const base64 = arrayBufferToBase64(pkcs8);
  return `-----BEGIN PRIVATE KEY-----\n${chunkString(base64)}\n-----END PRIVATE KEY-----\n`;
};

const generateRsaKeyMaterial = async () => {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto APIs are unavailable in this browser");
  }
  const keyPair = await subtle.generateKey(RSA_KEY_PARAMS, true, ["sign", "verify"]);
  const publicKeyBuffer = await subtle.exportKey("spki", keyPair.publicKey);
  const publicKeySpkiB64 = arrayBufferToBase64(publicKeyBuffer);
  const privateKeyPem = await exportPrivateKeyPem(keyPair.privateKey);
  return {
    publicKeySpkiB64,
    privateKeyPem,
  };
};

const generateDeviceSecret = () => {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return arrayBufferToBase64(bytes.buffer);
};

const sanitizeForFilename = (value) => {
  if (!value) {
    return "certificate";
  }
  return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
};

const downloadBlob = (blob, filename) => {
  if (!blob) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const buildBundleZip = async ({
  userLabel,
  certificatePem,
  rsaPrivateKeyPem,
  deviceSecret,
  mlKemPrivateKeyB64,
}) => {
  const zip = new JSZip();
  if (certificatePem) {
    zip.file(`certificate_${userLabel}.pem`, certificatePem);
  }
  if (rsaPrivateKeyPem) {
    zip.file(`rsa_private_${userLabel}.pem`, rsaPrivateKeyPem);
  }
  if (mlKemPrivateKeyB64) {
    zip.file(`ml_kem_private_${userLabel}.txt`, mlKemPrivateKeyB64);
  }
  if (deviceSecret) {
    zip.file(`device_secret_${userLabel}.txt`, deviceSecret);
  }
  return zip.generateAsync({ type: "blob" });
};

const CertificateIssuer = ({ onIssued, sectionId }) => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [validityDays, setValidityDays] = useState(DEFAULT_VALIDITY);
  const [issuing, setIssuing] = useState(false);
  const [issuingStatus, setIssuingStatus] = useState("");
  const [banner, setBanner] = useState(null);
  const [bundles, setBundles] = useState([]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const payload = await systemAdminService.listUsers({ roles: MANAGED_ROLE_FILTER });
      setUsers(payload?.users || []);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message;
      setUsersError(message || "Unable to load managed users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadExistingCertificates = useCallback(async () => {
    try {
      const response = await systemAdminService.listIssuedCertificates();
      const existingCerts = response?.certificates || [];
      
      // Convert to bundle format (without zipBlob since we can't recreate that)
      const convertedBundles = existingCerts.map(cert => ({
        id: cert.id,
        userId: cert.userId,
        fullName: cert.fullName,
        role: cert.role,
        issuedAt: cert.issuedAt,
        certificatePath: cert.certificatePath,
        isRevoked: cert.isRevoked,
        fromServer: true, // Mark as server-loaded (no download available)
      }));
      
      setBundles(convertedBundles);
    } catch (error) {
      // Silently fail - existing certificates are optional
      console.error("Failed to load existing certificates:", error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadExistingCertificates();
  }, [loadUsers, loadExistingCertificates]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter((user) => {
      return (
        user.username?.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  const toggleSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(filteredUsers.map((user) => user.id));
  };

  const handleBundleDownload = (bundle) => {
    if (!bundle?.zipBlob) {
      return;
    }
    downloadBlob(bundle.zipBlob, `privilege_bundle_${sanitizeForFilename(bundle.userId)}.zip`);
  };

  const issueForUsers = async () => {
    if (issuing) {
      return;
    }
    if (selectedUserIds.length === 0) {
      setBanner({ type: "error", text: "Select at least one operator." });
      return;
    }

    const targetUsers = users.filter((user) => selectedUserIds.includes(user.id));
    if (targetUsers.length === 0) {
      setBanner({ type: "error", text: "Selected operators are no longer available." });
      return;
    }

    setIssuing(true);
    setBanner(null);
    setIssuingStatus("Generating key material…");
    const newlyIssued = [];
    try {
      for (const target of targetUsers) {
        setIssuingStatus(`Issuing certificate for ${target.username}…`);
        const deviceSecret = generateDeviceSecret();
        const { publicKeySpkiB64, privateKeyPem } = await generateRsaKeyMaterial();

        const payload = {
          user_id: target.username,
          full_name: target.full_name,
          device_secret: deviceSecret,
          rsa_public_key_spki: publicKeySpkiB64,
          validity_days: Number(validityDays) || DEFAULT_VALIDITY,
          auto_generate_mlkem: true,
          role: target.role,
        };

        const result = await systemAdminService.issueCertificate(payload);
        const certificatePem = result?.certificate_pem || "";
        const mlKemPrivateKeyB64 = result?.ml_kem_private_key_b64 || "";
        const sanitized = sanitizeForFilename(target.username);
        const zipBlob = await buildBundleZip({
          userLabel: sanitized,
          certificatePem,
          rsaPrivateKeyPem: privateKeyPem,
          deviceSecret,
          mlKemPrivateKeyB64,
        });

        const bundleEntry = {
          id:
            window.crypto?.randomUUID?.() ?? `${target.username}-${Date.now().toString(36)}`,
          userId: target.username,
          fullName: target.full_name,
          issuedAt: new Date().toISOString(),
          certificatePath: result?.certificate_path,
          certificatePem,
          deviceSecret,
          mlKemPrivateKeyB64,
          rsaPrivateKeyPem: privateKeyPem,
          zipBlob,
        };
        newlyIssued.push(bundleEntry);
        handleBundleDownload(bundleEntry);

        if (onIssued) {
          onIssued({
            userId: target.username,
            fullName: target.full_name,
            certificatePath: result?.certificate_path,
            issuedAt: bundleEntry.issuedAt,
          });
        }
      }

      if (newlyIssued.length > 0) {
        setBundles((prev) => [...newlyIssued, ...prev]);
        setBanner({
          type: "success",
          text: `Issued ${newlyIssued.length} certificate${newlyIssued.length > 1 ? "s" : ""}. Bundles downloaded.`,
        });
      }
      setSelectedUserIds([]);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Issuance failed";
      setBanner({ type: "error", text: message });
    } finally {
      setIssuing(false);
      setIssuingStatus("");
    }
  };

  return (
    <div id={sectionId} className="space-y-6">
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Privileged issuance
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
              Auto-generate credential bundles for managed users
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Select any combination of customers, managers, or auditor clerks. We will mint
              certificates, generate device secrets, and package the artifacts as a download-ready bundle.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border p-4 text-sm border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <label className="flex flex-col text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Validity (days)
              <input
                type="number"
                min="15"
                max="365"
                value={validityDays}
                onChange={(event) => setValidityDays(event.target.value)}
                className="mt-1 rounded-xl border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
              />
            </label>
            <button
              type="button"
              onClick={issueForUsers}
              disabled={issuing || selectedUserIds.length === 0}
              className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {issuing ? issuingStatus || "Issuing…" : `Issue for ${selectedUserIds.length || 0} user${selectedUserIds.length === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={loadUsers}
              disabled={usersLoading}
              className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-lg transition disabled:opacity-60 border-slate-400 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              {usersLoading ? "Syncing…" : "Refresh users"}
            </button>
          </div>
        </div>
        {(banner || usersError) && (
          <div className="mt-4 space-y-2">
            {usersError && (
              <p className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                ⚠️ {usersError}
              </p>
            )}
            {banner && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  banner.type === "success"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100"
                    : "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                }`}
              >
                {banner.text}
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className="w-full rounded-2xl border px-4 py-2 text-sm placeholder:text-slate-500 transition focus:outline-none focus:ring-2 sm:w-80 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
            placeholder="Search by username, email, or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Selected {selectedUserIds.length} / {filteredUsers.length}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm divide-slate-200 dark:divide-slate-900/80">
            <thead className="text-xs font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/80"
                  />
                </th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-900/60">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-slate-500 dark:text-slate-500">
                    Loading managed users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-slate-500 dark:text-slate-500">
                    No managed users match this filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleSelection(user.id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/80"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{user.username}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 uppercase tracking-wide text-slate-600 dark:text-slate-400">{user.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.is_active 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" 
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="rounded-3xl border p-6 shadow-lg transition-all duration-300 border-blue-400/40 bg-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 dark:bg-blue-500/20">
            <span className="material-icons text-blue-600 dark:text-blue-300">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200">Certificate Authentication Instructions</h4>
            <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>How it works:</strong> Users authenticate using their downloaded certificate bundle (ZIP file containing .pem certificate, RSA private key, ML-KEM private key, and device secret).
              </p>
              <p>
                <strong>Important:</strong> ZIP bundles are only downloadable immediately after issuance. The system automatically downloads the bundle when you click "Issue for X users".
              </p>
              <p>
                <strong>Distribution:</strong> Securely deliver the downloaded ZIP file to the respective user through your organization's secure channel.
              </p>
              <p>
                <strong>User Login:</strong> Users will upload their certificate bundle on the login page to authenticate and access the system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateIssuer;
