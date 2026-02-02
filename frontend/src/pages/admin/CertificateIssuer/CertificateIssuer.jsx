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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Privileged issuance
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Auto-generate credential bundles for managed users
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Select any combination of customers, managers, or auditor clerks. We will mint
              certificates, generate device secrets, and package the artifacts as a download-ready bundle.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
              Validity (days)
              <input
                type="number"
                min="15"
                max="365"
                value={validityDays}
                onChange={(event) => setValidityDays(event.target.value)}
                className="mt-1 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={issueForUsers}
              disabled={issuing || selectedUserIds.length === 0}
              className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {issuing ? issuingStatus || "Issuing…" : `Issue for ${selectedUserIds.length || 0} user${selectedUserIds.length === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={loadUsers}
              disabled={usersLoading}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60"
            >
              {usersLoading ? "Syncing…" : "Refresh users"}
            </button>
          </div>
        </div>
        {(banner || usersError) && (
          <div className="mt-4 space-y-2">
            {usersError && (
              <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                ⚠️ {usersError}
              </p>
            )}
            {banner && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  banner.type === "success"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-100"
                }`}
              >
                {banner.text}
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-80"
            placeholder="Search by username, email, or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="text-sm text-slate-400">
            Selected {selectedUserIds.length} / {filteredUsers.length}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-white/10 bg-slate-900/80"
                  />
                </th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                    Loading managed users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                    No managed users match this filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleSelection(user.id)}
                        className="h-4 w-4 rounded border-white/10 bg-slate-900/80"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.username}</td>
                    <td className="px-4 py-3">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 uppercase tracking-wide text-slate-400">{user.role}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.is_active ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"
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

      {bundles.length > 0 && (
        <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-100">Escrow bundles</h3>
              <p className="text-sm text-slate-400">
                {bundles.length} sealed bundle{bundles.length === 1 ? "" : "s"} ready for delivery.
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-900/80 text-left text-sm text-slate-100">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {bundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{bundle.fullName}</div>
                      <div className="text-xs text-slate-400">{bundle.userId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(bundle.issuedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {bundle.certificatePath ? (
                        <a
                          href={bundle.certificatePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                        >
                          Vault PEM
                        </a>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleBundleDownload(bundle)}
                        className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/10"
                      >
                        Download again
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateIssuer;
