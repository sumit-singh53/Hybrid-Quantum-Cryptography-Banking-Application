import React from "react";
import { formatRelativeTime } from "../../../utils/dateFormatter";
import Pagination from "../../../components/common/Pagination";
import "./SecurityEventFeed.css";

const SecurityEventFeed = ({ events = [], onRefresh, sectionId, currentPage = 1, totalItems = 0, itemsPerPage = 10, onPageChange }) => {
  return (
    <div
      id={sectionId}
      className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">
            Security telemetry
          </h3>
          <p className="text-sm text-slate-400">
            Live device posture &amp; challenge anomalies.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="min-w-[150px] rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/20"
        >
          Refresh signals
        </button>
      </div>
      <ul className="mt-6 space-y-4">
        {events.length === 0 && (
          <li className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300">
            No recent events recorded.
          </li>
        )}
        {events.map((event) => (
          <li
            key={event.event_id}
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <strong className="text-sm text-white">{event.event_type}</strong>
                <p className="mt-1 text-sm text-slate-400">
                  {event.metadata?.context || "--"}
                </p>
              </div>
              <span className="ml-4 text-xs text-slate-500 whitespace-nowrap">
                {formatRelativeTime(event.timestamp)}
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

export default SecurityEventFeed;
