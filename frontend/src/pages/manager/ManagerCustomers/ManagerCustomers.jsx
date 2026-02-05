import React, { useEffect, useMemo, useState } from "react";
import {
  fetchManagedCustomers,
  resetCustomerDeviceBinding,
} from "../../../services/managerService";
import "./ManagerCustomers.css";

const ManagerCustomers = () => {
  const [roster, setRoster] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [bindingFilter, setBindingFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchManagedCustomers();
      setRoster(data || []);
      setMessage(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    let result = roster;
    
    // Apply search
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.owner?.toLowerCase().includes(q) ||
          entry.certificate_id?.toLowerCase().includes(q) ||
          entry.branch?.label?.toLowerCase().includes(q)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((entry) => entry.status === statusFilter);
    }
    
    // Apply binding filter
    if (bindingFilter !== "all") {
      result = result.filter((entry) => entry.binding_state === bindingFilter);
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === "branch") {
          aVal = a.branch?.label || "";
          bVal = b.branch?.label || "";
        }
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [query, roster, statusFilter, bindingFilter, sortConfig]);

  const handleReset = async (userId) => {
    try {
      await resetCustomerDeviceBinding(userId);
      setMessage(`Device binding reset for ${userId}`);
      loadCustomers();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to reset binding");
    }
  };

  const handleBulkReset = async () => {
    if (selectedIds.size === 0) {
      setMessage("Please select at least one customer");
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const certId of selectedIds) {
      try {
        await resetCustomerDeviceBinding(certId);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    setSelectedIds(new Set());
    setMessage(`${successCount} bindings reset successfully${failCount > 0 ? `, ${failCount} failed` : ""}`);
    loadCustomers();
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(c => c.certificate_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (certId, checked) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(certId);
      } else {
        newSet.delete(certId);
      }
      return newSet;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportToCSV = () => {
    const headers = ["Owner", "Certificate ID", "Branch", "Status", "Binding State", "Last Seen"];
    const rows = filtered.map(entry => [
      entry.owner,
      entry.certificate_id,
      entry.branch?.label || "",
      entry.status,
      entry.binding_state,
      entry.last_seen || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Customers under your branch
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Inspect device binding state and last activity per certificate before
          approving additional limits.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            placeholder="Search by name, certificate, or branch..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={bindingFilter}
            onChange={(e) => setBindingFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Bindings</option>
            <option value="bound">Bound</option>
            <option value="unbound">Unbound</option>
          </select>
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={loadCustomers}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <span className="text-sm font-semibold text-indigo-900">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkReset}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Reset All Bindings
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {message && (
        <p className="text-sm font-medium text-rose-600">{message}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("owner")}
              >
                Owner {sortConfig.key === "owner" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Certificate</th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("branch")}
              >
                Branch {sortConfig.key === "branch" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("status")}
              >
                Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("binding_state")}
              >
                Binding {sortConfig.key === "binding_state" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.map((entry) => (
              <tr key={entry.certificate_id} className={selectedIds.has(entry.certificate_id) ? "bg-indigo-50" : ""}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.certificate_id)}
                    onChange={(e) => handleSelectOne(entry.certificate_id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3 font-semibold">{entry.owner}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {entry.certificate_id}
                </td>
                <td className="px-4 py-3">{entry.branch?.label}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                    entry.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    entry.status === "revoked" ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize">{entry.binding_state}</td>
                <td className="px-4 py-3 text-slate-500">
                  {entry.last_seen || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReset(entry.certificate_id)}
                      className="rounded-2xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      Reset binding
                    </button>
                    <button
                      onClick={() => setSelectedCustomer(entry)}
                      className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan="8"
                >
                  {query || statusFilter !== "all" || bindingFilter !== "all" 
                    ? "No customers match the current filters." 
                    : "No customers found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{selectedCustomer.owner}</h3>
                <p className="mt-1 font-mono text-sm text-slate-500">{selectedCustomer.certificate_id}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{selectedCustomer.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Binding State</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{selectedCustomer.binding_state}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{selectedCustomer.branch?.label}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{selectedCustomer.last_seen || "Never"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Certificate ID</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-900">{selectedCustomer.certificate_id}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleReset(selectedCustomer.certificate_id);
                    setSelectedCustomer(null);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Reset Device Binding
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerCustomers;
