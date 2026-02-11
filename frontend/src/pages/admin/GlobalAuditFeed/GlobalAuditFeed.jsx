import { formatRelativeTime } from "../../../utils/dateFormatter";
import Pagination from "../../../components/common/Pagination";
import "./GlobalAuditFeed.css";

const getActionIcon = (entry) => {
  const action = (entry.action_name || entry.path || "").toLowerCase();
  
  if (action.includes("login") || action.includes("auth")) return "login";
  if (action.includes("logout")) return "logout";
  if (action.includes("transaction") || action.includes("transfer")) return "account_balance";
  if (action.includes("certificate") || action.includes("cert")) return "workspace_premium";
  if (action.includes("role") || action.includes("permission")) return "badge";
  if (action.includes("security") || action.includes("policy")) return "security";
  if (action.includes("crypto") || action.includes("key")) return "key";
  if (action.includes("audit")) return "description";
  
  return "circle";
};

const getActionColor = (entry) => {
  const action = (entry.action_name || entry.path || "").toLowerCase();
  const method = (entry.method || "").toUpperCase();
  
  if (method === "POST" || action.includes("create")) return "emerald";
  if (method === "PUT" || method === "PATCH" || action.includes("update")) return "blue";
  if (method === "DELETE" || action.includes("delete") || action.includes("revoke")) return "rose";
  if (action.includes("login") || action.includes("auth")) return "purple";
  if (action.includes("security") || action.includes("policy")) return "amber";
  
  return "slate";
};

const maskSensitiveData = (text) => {
  if (!text) return text;
  // Mask certificate IDs and long hashes
  if (text.length > 40 && /^[a-f0-9]+$/i.test(text)) {
    return text.substring(0, 8) + "..." + text.substring(text.length - 8);
  }
  return text;
};

const GlobalAuditFeed = ({ 
  entries = [], 
  onRefresh, 
  sectionId, 
  loading = false,
  currentPage = 1, 
  totalItems = 0, 
  itemsPerPage = 20, 
  onPageChange 
}) => {
  return (
    <div
      id={sectionId}
      className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Audit Trail
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {totalItems > 0 ? `${totalItems} total entries` : "Cryptographically signed activity log"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading audit logs...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border px-6 py-12 text-center border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="material-icons text-5xl text-slate-400 dark:text-slate-600">description</span>
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
            No audit entries found
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Try adjusting your filters or refresh the feed
          </p>
        </div>
      ) : (
        <>
          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-left text-sm divide-slate-200 dark:divide-slate-800">
              <thead className="text-xs font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.map((entry, index) => {
                  const color = getActionColor(entry);
                  const icon = getActionIcon(entry);
                  
                  return (
                    <tr 
                      key={entry.event_id || entry.entry_hash || `${entry.certificate_id}-${entry.timestamp}-${index}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`material-icons text-lg text-${color}-600 dark:text-${color}-400`}>
                            {icon}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.action_name || entry.action || "Request"}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {maskSensitiveData(entry.user_id || entry.certificate_id || "system")}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {entry.role && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {entry.role}
                          </span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3">
                        {entry.method && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            entry.method === "GET" 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : entry.method === "POST"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : entry.method === "PUT" || entry.method === "PATCH"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : entry.method === "DELETE"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {entry.method}
                          </span>
                        )}
                      </td>

                      {/* Path */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {entry.path || "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <span className="material-icons text-xs">check_circle</span>
                          Success
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {onPageChange && totalItems > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GlobalAuditFeed;
