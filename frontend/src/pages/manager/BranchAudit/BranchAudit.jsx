import React, { useEffect, useState, useMemo } from "react";
import { fetchBranchAudit } from "../../../services/managerService";
import "./BranchAudit.css";

const BranchAudit = () => {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const itemsPerPage = 50;

  const loadAudit = async () => {
    try {
      const data = await fetchBranchAudit();
      setEvents(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load branch trail");
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filteredEvents = useMemo(() => {
    let result = events;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (event) =>
          event.action_name?.toLowerCase().includes(q) ||
          event.certificate_id?.toLowerCase().includes(q) ||
          event.branch?.label?.toLowerCase().includes(q) ||
          event.path?.toLowerCase().includes(q)
      );
    }
    
    if (actionFilter !== "all") {
      result = result.filter((event) => event.action_name === actionFilter);
    }
    
    if (methodFilter !== "all") {
      result = result.filter((event) => event.method === methodFilter);
    }
    
    return result;
  }, [events, searchQuery, actionFilter, methodFilter]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueActions = [...new Set(events.map(e => e.action_name))].filter(Boolean);
  
  const exportToCSV = () => {
    const headers = ["Timestamp", "Branch", "Method", "Path", "Action", "Certificate ID"];
    const rows = filteredEvents.map(event => [
      event.timestamp,
      event.branch?.label || "",
      event.method,
      event.path,
      event.action_name,
      event.certificate_id
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branch-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">
          Branch audit trail
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Immutable request log projected by branch fingerprinting. Use this
          when reconciling suspicious approvals.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by action, certificate, branch, or path..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <button
            onClick={loadAudit}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredEvents.length === 0}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>

        {filteredEvents.length > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      
      <div className="space-y-4 border-l-4 border-indigo-200 pl-5">
        {paginatedEvents.map((entry) => (
          <article
            key={entry.event_id}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            onClick={() => setSelectedEvent(entry)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {entry.branch?.label} • {entry.timestamp}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    entry.method === "GET" ? "bg-blue-100 text-blue-700" :
                    entry.method === "POST" ? "bg-emerald-100 text-emerald-700" :
                    entry.method === "PUT" ? "bg-amber-100 text-amber-700" :
                    entry.method === "DELETE" ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {entry.method}
                  </span>
                  {" "}
                  {entry.path} — {entry.action_name}
                </p>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  Certificate: {entry.certificate_id?.substring(0, 24)}...
                </p>
              </div>
              <button 
                onClick={() => setSelectedEvent(entry)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </article>
        ))}
        {paginatedEvents.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {searchQuery || actionFilter !== "all" || methodFilter !== "all"
              ? "No events match the current filters."
              : "No branch activity captured yet."}
          </p>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Audit Event Details</h3>
                <p className="mt-1 font-mono text-sm text-slate-500">Event ID: {selectedEvent.event_id}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
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
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timestamp</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEvent.timestamp}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEvent.branch?.label}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Method</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEvent.method}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Action</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEvent.action_name}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Path</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{selectedEvent.path}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Certificate ID</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-900">{selectedEvent.certificate_id}</p>
              </div>

              {selectedEvent.lineage_id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lineage ID</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-900">{selectedEvent.lineage_id}</p>
                </div>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchAudit;
