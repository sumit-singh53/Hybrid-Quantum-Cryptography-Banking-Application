import React, { useCallback, useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import SecurityEventFeed from "../SecurityEventFeed";
import SessionKillSwitch from "../SessionKillSwitch";
import "./SystemAdminSecurityOps.css";

const normalizeEvents = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.events)) {
    return payload.events;
  }
  return [];
};

const SystemAdminSecurityOps = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Security Policies State
  const [policies, setPolicies] = useState({});
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState("");
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyValues, setPolicyValues] = useState({});
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemAdminService.getSecurityEvents();
      setEvents(normalizeEvents(data));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to fetch telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError("");
    setSuccessMessage("");
    try {
      const data = await systemAdminService.getSecurityPolicies();
      setPolicies(data.policies || {});
      
      // Initialize policy values for editing
      const initialValues = {};
      Object.values(data.policies || {}).flat().forEach(policy => {
        initialValues[policy.policy_key] = policy.policy_value;
      });
      setPolicyValues(initialValues);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setPoliciesError(message || "Failed to load security policies");
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadPolicies();
  }, [loadEvents, loadPolicies]);

  const handlePolicyEdit = (policyKey) => {
    setEditingPolicy(policyKey);
    setSuccessMessage("");
    setPoliciesError("");
  };

  const handlePolicyCancel = () => {
    setEditingPolicy(null);
    // Reset to original value
    loadPolicies();
  };

  const handlePolicyChange = (policyKey, value) => {
    setPolicyValues(prev => ({
      ...prev,
      [policyKey]: value
    }));
  };

  const handlePolicySave = async (policyKey) => {
    setSavingPolicy(true);
    setPoliciesError("");
    setSuccessMessage("");
    
    try {
      await systemAdminService.updateSecurityPolicy(policyKey, policyValues[policyKey]);
      setSuccessMessage(`Policy "${policyKey}" updated successfully`);
      setEditingPolicy(null);
      await loadPolicies();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message;
      setPoliciesError(message || "Failed to update policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      authentication: "lock",
      session: "schedule",
      access_control: "security",
      transaction: "account_balance",
      audit: "description",
    };
    return icons[category] || "settings";
  };

  const getCategoryColor = (category) => {
    const colors = {
      authentication: "blue",
      session: "purple",
      access_control: "emerald",
      transaction: "amber",
      audit: "rose",
    };
    return colors[category] || "slate";
  };

  const getCategoryLabel = (category) => {
    const labels = {
      authentication: "Authentication Policies",
      session: "Session Policies",
      access_control: "Access Control Policies",
      transaction: "Transaction Security Policies",
      audit: "Logging & Audit Policies",
    };
    return labels[category] || category;
  };

  const renderPolicyInput = (policy) => {
    const isEditing = editingPolicy === policy.policy_key;
    const value = policyValues[policy.policy_key] || policy.policy_value;
    
    // Boolean policies
    if (value === "true" || value === "false") {
      if (isEditing) {
        return (
          <select
            value={value}
            onChange={(e) => handlePolicyChange(policy.policy_key, e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        );
      }
      return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          value === "true"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}>
          <span className="material-icons text-xs">{value === "true" ? "check" : "close"}</span>
          {value === "true" ? "Enabled" : "Disabled"}
        </span>
      );
    }
    
    // Numeric policies
    if (isEditing) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handlePolicyChange(policy.policy_key, e.target.value)}
          className="w-32 rounded-lg border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      );
    }
    
    return (
      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </span>
    );
  };

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Messages */}
      {(policiesError || successMessage) && (
        <div className="space-y-2">
          {policiesError && (
            <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <span className="material-icons text-lg">error</span>
                {policiesError}
              </div>
            </div>
          )}
          {successMessage && (
            <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <div className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                {successMessage}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Policies Section */}
      {policiesLoading ? (
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading security policies...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(policies).map(([category, categoryPolicies]) => {
            const color = getCategoryColor(category);
            const icon = getCategoryIcon(category);
            
            return (
              <div
                key={category}
                className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`material-icons text-${color}-600 dark:text-${color}-400`}>
                    {icon}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {getCategoryLabel(category)}
                  </h3>
                </div>

                <div className="space-y-3">
                  {categoryPolicies.map((policy) => (
                    <div
                      key={policy.policy_key}
                      className="flex items-center justify-between rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {policy.policy_key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {policy.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderPolicyInput(policy)}
                        
                        {editingPolicy === policy.policy_key ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePolicySave(policy.policy_key)}
                              disabled={savingPolicy}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                            >
                              <span className="material-icons text-sm">check</span>
                              Save
                            </button>
                            <button
                              onClick={handlePolicyCancel}
                              disabled={savingPolicy}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                            >
                              <span className="material-icons text-sm">close</span>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePolicyEdit(policy.policy_key)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                          >
                            <span className="material-icons text-sm">edit</span>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Events & Session Controls */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="material-icons text-rose-600 dark:text-rose-400">security</span>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Security Monitoring & Controls
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Real-time security events and emergency session management
            </p>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-200">
                ⚠️ {error}
              </p>
            )}
          </div>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="h-fit rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-cyan-400/40 bg-cyan-500/10 text-cyan-700 hover:border-cyan-500 hover:bg-cyan-500/20 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:border-cyan-200 dark:hover:bg-cyan-500/20"
          >
            {loading ? "Syncing" : "Refresh Events"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityEventFeed
          sectionId="sys-admin-security"
          events={events}
          onRefresh={loadEvents}
        />
        <SessionKillSwitch sectionId="sys-admin-kill" />
      </div>

      {/* Security Notice */}
      <div className="rounded-3xl border p-5 shadow-lg transition-all duration-300 border-amber-400/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 dark:bg-amber-500/20">
            <span className="material-icons text-amber-600 dark:text-amber-300">warning</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-200">Security Policy Warning</h4>
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>• All policy changes are logged and audited</p>
              <p>• Changes take effect immediately and may impact active sessions</p>
              <p>• Weak security settings may expose the system to vulnerabilities</p>
              <p>• Only modify policies during maintenance windows when possible</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SystemAdminSecurityOps;
