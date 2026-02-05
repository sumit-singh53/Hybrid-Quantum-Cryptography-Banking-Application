import React from "react";
import { formatRelativeTime } from "../../../utils/dateFormatter";
import Pagination from "../../../components/common/Pagination";
import "./GlobalAuditFeed.css";

const formatRow = (entry) => {
  const action = entry.action_name || entry.path || "request";
  const actor = entry.user_id || entry.certificate_id || "unknown";
  return `${action} · ${actor}`;
};

const GlobalAuditFeed = ({ entries = [], onRefresh, sectionId, currentPage = 1, totalItems = 0, itemsPerPage = 15, onPageChange }) => {
  return (
    <div
      id={sectionId}
      className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">
            Global audit trace
          </h3>
          <p className="text-sm text-slate-400">
            Signed activity spanning every certificate.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="min-w-[150px] rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/20"
        >
          Sync audit chain
        </button>
      </div>
      <ul className="mt-6 space-y-4">
        {entries.length === 0 && (
          <li className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300">
            No audit activity yet.
          </li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.event_id || `${entry.certificate_id}-${entry.timestamp}`}
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <strong className="text-sm text-white">{formatRow(entry)}</strong>
                <p className="mt-1 text-sm text-slate-400">
                  {(entry.method || "").toUpperCase()} {entry.path || ""}
                </p>
              </div>
              <span className="ml-4 text-xs text-slate-500 whitespace-nowrap">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default GlobalAuditFeed;
