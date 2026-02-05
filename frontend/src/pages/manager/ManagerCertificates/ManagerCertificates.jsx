import React, { useEffect, useState, useMemo } from "react";
import {
  fetchManagedCustomers,
  revokeCertificate,
} from "../../../services/managerService";
import "./ManagerCertificates.css";

const ManagerCertificates = () => {
  const [roster, setRoster] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("Violation of branch policy");
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [detailView, setDetailView] = useState(null);

  const loadRoster = async () => {
    try {
      const data = await fetchManagedCustomers();
      setRoster(data || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Unable to load certificates");
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const filtered = useMemo(() => {
    let result = roster;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.owner?.toLowerCase().includes(q) ||
          entry.certificate_id?.toLowerCase().includes(q) ||
          entry.branch?.label?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter((entry) => entry.status === statusFilter);
    }
    
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
  }, [roster, searchQuery, statusFilter, sortConfig]);

  const handleRevoke = async () => {
    if (!selected) {
      setMessage("Select a certificate first");
      return;
    }
    try {
      await revokeCertificate(selected.certificate_id, reason);
      setMessage(`Certificate ${selected.certificate_id} revoked`);
      setReason("Violation of branch policy");
      setSelected(null);
      loadRoster();
    } catch (err) {
      setMessage(
        err?.response?.data?.message || "Unable to revoke certificate",
      );
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedIds.size === 0) {
      setMessage("Please select at least one certificate");
      return;
    }
    if (!reason) {
      setMessage("Revocation reason is required");
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const certId of selectedIds) {
      try {
        await revokeCertificate(certId, reason);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    setSelectedIds(new Set());
    setMessage(`${successCount} certificates revoked${failCount > 0 ? `, ${failCount} failed` : ""}`);
    setReason("Violation of branch policy");
    loadRoster();
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filtered.filter(c => c.status === "active").map(c => c.certificate_id)));
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
    const headers = ["Owner", "Certificate ID", "Branch", "Status"];
    const rows = filtered.map(entry => [
      entry.owner,
      entry.certificate_id,
      entry.branch?.label || "",
      entry.status
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Certificate controls
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Managers can only revoke certificates; issuance remains centralized at the CA.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          message.includes("failed") || message.includes("Unable") || message.includes("Select")
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by owner, certificate ID, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={loadRoster}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
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
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <span className="text-sm font-semibold text-rose-900">
              {selectedIds.size} selected
            </span>
            <input
              type="text"
              placeholder="Reason for revocation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <button
              onClick={handleBulkRevoke}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Revoke Selected
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filtered.filter(c => c.status === "active").length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
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
                onClick={() => handleSort("status")}
              >
                Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="cursor-pointer px-4 py-3 hover:bg-slate-100"
                onClick={() => handleSort("branch")}
              >
                Branch {sortConfig.key === "branch" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.map((entry) => (
              <tr 
                key={entry.certificate_id}
                className={selectedIds.has(entry.certificate_id) ? "bg-rose-50" : ""}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.certificate_id)}
                    onChange={(e) => handleSelectOne(entry.certificate_id, e.target.checked)}
                    disabled={entry.status !== "active"}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-3 font-semibold">{entry.owner}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {entry.certificate_id?.substring(0, 16)}...
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    entry.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    entry.status === "revoked" ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3">{entry.branch?.label}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {entry.status === "active" && (
                      <button
                        onClick={() => setSelected(entry)}
                        className="rounded-2xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => setDetailView(entry)}
                      className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan="6">
                  {searchQuery || statusFilter !== "all" 
                    ? "No certificates match the current filters." 
                    : "No certificates found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Revoke Confirmation Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-900">Revoke Certificate</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-slate-700">
                  <strong>Owner:</strong> {selected.owner}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {selected.certificate_id}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Revocation Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRevoke}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Revoke Certificate
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Detail Modal */}
      {detailView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setDetailView(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Certificate Details</h3>
                <p className="mt-1 font-mono text-sm text-slate-500">{detailView.owner}</p>
              </div>
              <button
                onClick={() => setDetailView(null)}
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
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{detailView.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{detailView.branch?.label}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Binding State</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{detailView.binding_state || "Unknown"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{detailView.last_seen || "Never"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Certificate ID</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-900">{detailView.certificate_id}</p>
              </div>

              <div className="flex gap-3">
                {detailView.status === "active" && (
                  <button
                    onClick={() => {
                      setSelected(detailView);
                      setDetailView(null);
                    }}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Revoke Certificate
                  </button>
                )}
                <button
                  onClick={() => setDetailView(null)}
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

export default ManagerCertificates;
