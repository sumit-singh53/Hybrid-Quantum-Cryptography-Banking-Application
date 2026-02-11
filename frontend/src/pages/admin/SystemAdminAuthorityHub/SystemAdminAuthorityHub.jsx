import React, { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import AuthorityControls from "../AuthorityControls";
import "./SystemAdminAuthorityHub.css";

const SystemAdminAuthorityHub = () => {
  const [cryptoStatus, setCryptoStatus] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCryptoData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, healthData, algoData] = await Promise.all([
        systemAdminService.getCryptoStatus(),
        systemAdminService.getCryptoHealth(),
        systemAdminService.getCryptoAlgorithms(),
      ]);
      
      setCryptoStatus(statusData);
      setHealthStatus(healthData);
      setAlgorithms(algoData.algorithms || []);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setError(message || "Failed to load cryptography data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCryptoData();
  }, [loadCryptoData]);

  const handleRotation = () => {
    // Reload crypto data after rotation
    loadCryptoData();
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status) => {
    if (status === "healthy") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <span className="material-icons text-sm">check_circle</span>
          Healthy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <span className="material-icons text-sm">warning</span>
        Degraded
      </span>
    );
  };

  const getEnabledBadge = (enabled) => {
    if (enabled) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <span className="material-icons text-xs">check</span>
          Enabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
        <span className="material-icons text-xs">close</span>
        Disabled
      </span>
    );
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <span className="material-icons text-lg">error</span>
            {error}
          </div>
        </div>
      )}

      {/* CA Rotation Controls */}
      <AuthorityControls sectionId="sys-admin-ca" onRotation={handleRotation} />

      {/* Loading State */}
      {loading ? (
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading cryptography data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Overall Health Status */}
          {healthStatus && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Encryption Health Status
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    System-wide cryptographic health indicators
                  </p>
                </div>
                {getStatusBadge(healthStatus.overall_status)}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {healthStatus.checks?.map((check, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="material-icons text-slate-600 dark:text-slate-400">
                        {check.status === "healthy" ? "verified" : "error"}
                      </span>
                      {check.critical && (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {check.name}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 capitalize">
                      {check.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptography Configuration */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Classical Encryption */}
            {cryptoStatus?.classical && (
              <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-blue-600 dark:text-blue-400">lock</span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Classical Encryption
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      RSA-based certificate authority
                    </p>
                  </div>
                  {getEnabledBadge(cryptoStatus.classical.enabled)}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Algorithm:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {cryptoStatus.classical.algorithm}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Hash Algorithm:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {cryptoStatus.classical.hash_algorithm}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Last Modified:</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {formatDate(cryptoStatus.classical.last_modified)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Key Size:</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {cryptoStatus.classical.key_size_bytes} bytes
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Post-Quantum Encryption */}
            {cryptoStatus?.post_quantum && (
              <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-purple-600 dark:text-purple-400">shield</span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Post-Quantum Cryptography
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Quantum-resistant signatures
                    </p>
                  </div>
                  {getEnabledBadge(cryptoStatus.post_quantum.enabled)}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Algorithm:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {cryptoStatus.post_quantum.algorithm}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Last Modified:</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {formatDate(cryptoStatus.post_quantum.last_modified)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Key Size:</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {cryptoStatus.post_quantum.key_size_bytes} bytes
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ML-KEM Status */}
          {cryptoStatus?.kem && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-cyan-600 dark:text-cyan-400">vpn_key</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Key Encapsulation Mechanism
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {cryptoStatus.kem.use_case}
                  </p>
                </div>
                {getEnabledBadge(cryptoStatus.kem.enabled)}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Algorithm:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {cryptoStatus.kem.algorithm}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Shared Secret Size:</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {cryptoStatus.kem.shared_secret_bytes} bytes
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Statistics */}
          {cryptoStatus?.certificates && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="material-icons text-indigo-600 dark:text-indigo-400">workspace_premium</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Certificate Statistics
                </h3>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Total Certificates</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {cryptoStatus.certificates.total}
                  </p>
                </div>
                {Object.entries(cryptoStatus.certificates.by_role || {}).map(([role, count]) => (
                  <div key={role} className="rounded-2xl border p-4 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{role.replace('_', ' ')}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Storage Path:</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {cryptoStatus.certificates.storage_path}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Encryption:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {cryptoStatus.certificates.encryption}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CRL Status */}
          {cryptoStatus?.crl && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-rose-600 dark:text-rose-400">block</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Certificate Revocation List
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Revoked certificate tracking
                  </p>
                </div>
                {getEnabledBadge(cryptoStatus.crl.enabled)}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Revoked Certificates:</span>
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    {cryptoStatus.crl.revoked_count}
                  </span>
                </div>
                {cryptoStatus.crl.cache_ttl_seconds && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Cache TTL:</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {cryptoStatus.crl.cache_ttl_seconds}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cryptographic Algorithms */}
          {algorithms.length > 0 && (
            <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="material-icons text-emerald-600 dark:text-emerald-400">code</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Cryptographic Algorithms
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Standards-compliant algorithms in use
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y text-left text-sm divide-slate-200 dark:divide-slate-800">
                  <thead className="text-xs font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Algorithm</th>
                      <th className="px-4 py-3">Purpose</th>
                      <th className="px-4 py-3">Standard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {algorithms.map((algo, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {algo.category}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {algo.algorithm}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {algo.purpose}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {algo.standard}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="rounded-3xl border p-5 shadow-lg transition-all duration-300 border-amber-400/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 dark:bg-amber-500/20">
                <span className="material-icons text-amber-600 dark:text-amber-300">security</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-200">Security Notice</h4>
                <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>• Private keys and cryptographic secrets are never exposed through this interface</p>
                  <p>• All cryptographic operations are logged for audit purposes</p>
                  <p>• Key rotation should only be performed during maintenance windows</p>
                  <p>• This page is restricted to System Administrator role only</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default SystemAdminAuthorityHub;
