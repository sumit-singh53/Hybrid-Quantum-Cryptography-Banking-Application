import { useState, useEffect } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./SystemConfiguration.css";

const SystemConfiguration = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchConfigurations();
    fetchSummary();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await systemAdminService.getSystemConfig();
      setConfigs(response.configs || {});
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await systemAdminService.getSystemConfigSummary();
      setSummary(response);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  const handleValueChange = (configKey, newValue) => {
    setEditedValues((prev) => ({
      ...prev,
      [configKey]: newValue,
    }));
  };

  const hasChanges = () => {
    return Object.keys(editedValues).length > 0;
  };

  const prepareUpdates = () => {
    const updates = [];
    Object.entries(editedValues).forEach(([key, value]) => {
      updates.push({
        config_key: key,
        config_value: value,
      });
    });
    return updates;
  };

  const handleSaveChanges = () => {
    const updates = prepareUpdates();
    setPendingUpdates(updates);
    setShowConfirmModal(true);
  };

  const confirmSaveChanges = async () => {
    try {
      setLoading(true);
      await systemAdminService.bulkUpdateSystemConfig(pendingUpdates);
      setSuccess("Configuration updated successfully");
      setEditedValues({});
      setShowConfirmModal(false);
      await fetchConfigurations();
      await fetchSummary();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update configuration");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEditedValues({});
    setError(null);
    setSuccess(null);
  };

  const renderConfigInput = (config) => {
    const currentValue = editedValues[config.config_key] ?? config.config_value;
    const isBoolean = currentValue === "true" || currentValue === "false";
    const isNumber = !isNaN(currentValue) && currentValue !== "";

    const inputClasses = "w-full rounded-xl border px-3 py-2 text-sm transition border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400";

    if (isBoolean) {
      return (
        <select
          value={currentValue}
          onChange={(e) => handleValueChange(config.config_key, e.target.value)}
          className={inputClasses}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      );
    }

    if (isNumber) {
      return (
        <input
          type="number"
          value={currentValue}
          onChange={(e) => handleValueChange(config.config_key, e.target.value)}
          className={inputClasses}
          min="0"
        />
      );
    }

    return (
      <input
        type="text"
        value={currentValue}
        onChange={(e) => handleValueChange(config.config_key, e.target.value)}
        className={inputClasses}
      />
    );
  };

  const getCategoryTitle = (category) => {
    const titles = {
      transaction: "Transaction Settings",
      session: "Session & Security Settings",
      operational: "Operational Settings",
      notification: "Notification Settings",
    };
    return titles[category] || category;
  };

  if (loading && !configs) {
    return (
      <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
        <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading system configuration...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <span className="material-icons text-indigo-600 dark:text-indigo-400">settings</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              System Configuration
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage system-wide operational settings and parameters
            </p>
          </div>
        </div>

        {summary && (
          <div className="grid gap-4 sm:grid-cols-3 mt-6">
            <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <span className="material-icons text-blue-600 dark:text-blue-400">dashboard</span>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Total Settings</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {summary.total_configs}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <span className="material-icons text-emerald-600 dark:text-emerald-400">check_circle</span>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Active</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {summary.active_configs}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <span className="material-icons text-purple-600 dark:text-purple-400">category</span>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Categories</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Object.keys(summary.category_counts || {}).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <span className="material-icons text-lg">error</span>
            {error}
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="material-icons text-lg">check_circle</span>
            {success}
          </div>
        </div>
      )}

      {/* Configuration Sections */}
      <div className="space-y-6">
        {Object.entries(configs).map(([category, categoryConfigs]) => (
          <div key={category} className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="material-icons text-indigo-600 dark:text-indigo-400">
                  {category === 'transaction' ? 'account_balance' : 
                   category === 'session' ? 'lock' : 
                   category === 'operational' ? 'settings' : 
                   'notifications'}
                </span>
                {getCategoryTitle(category)}
              </h2>
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {categoryConfigs.length} settings
              </span>
            </div>

            <div className="space-y-4">
              {categoryConfigs.map((config) => (
                <div key={config.config_key} className="rounded-2xl border p-4 transition border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                        {config.description}
                      </label>
                      <span className="inline-block text-xs font-mono px-2 py-1 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {config.config_key}
                      </span>
                      {config.updated_by && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                          Last updated by {config.updated_by} on{" "}
                          {new Date(config.updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 lg:min-w-[300px]">
                      {renderConfigInput(config)}
                      {editedValues[config.config_key] !== undefined && (
                        <span className="rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {hasChanges() && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-3">
          <button
            onClick={handleReset}
            className="rounded-2xl border px-6 py-3 text-sm font-semibold transition shadow-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span className="flex items-center gap-2">
              <span className="material-icons text-lg">refresh</span>
              Reset Changes
            </span>
          </button>
          <button
            onClick={handleSaveChanges}
            className="rounded-2xl border px-6 py-3 text-sm font-semibold transition shadow-lg border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 dark:from-indigo-500 dark:to-indigo-400"
          >
            <span className="flex items-center gap-2">
              <span className="material-icons text-lg">save</span>
              Save Configuration ({Object.keys(editedValues).length} changes)
            </span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border shadow-2xl border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <span className="material-icons text-amber-600 dark:text-amber-400">warning</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Confirm Configuration Changes
              </h3>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border px-4 py-3 mb-6 border-amber-400/40 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <span className="material-icons text-lg">info</span>
                  <p className="text-sm">
                    You are about to update {pendingUpdates.length} system configuration(s).
                    This may affect system behavior immediately.
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingUpdates.map((update) => (
                  <div
                    key={update.config_key}
                    className="rounded-2xl border p-3 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {update.config_key}
                      </span>
                      <span className="material-icons text-indigo-600 dark:text-indigo-400">arrow_forward</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {update.config_value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-2xl border px-6 py-2 text-sm font-semibold transition border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveChanges}
                disabled={loading}
                className="rounded-2xl border px-6 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border-rose-400/40 bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-700 hover:to-rose-600"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Saving...
                  </span>
                ) : (
                  "Confirm Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SystemConfiguration;
