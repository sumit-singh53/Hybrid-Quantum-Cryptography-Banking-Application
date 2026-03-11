import React, { useEffect, useState } from "react";
import {
  fetchBranchAuditOverview,
  fetchBranchActivityReport,
} from "../../../services/managerService";
import "./BranchAudit.css";

const BranchAudit = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchReport, setBranchReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const loadBranchOverview = async () => {
    setLoading(true);
    try {
      const data = await fetchBranchAuditOverview();
      setBranches(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load branch audit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchOverview();
  }, []);

  const handleBranchSelect = async (branchCode) => {
    setSelectedBranch(branchCode);
    setReportLoading(true);
    try {
      const report = await fetchBranchActivityReport(branchCode);
      setBranchReport(report);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load branch report");
      setBranchReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const getComplianceBadgeClass = (status) => {
    if (status === "Compliant") return "compliance-compliant";
    if (status === "Monitor") return "compliance-monitor";
    if (status === "Review Required") return "compliance-review";
    return "bg-slate-100 text-slate-700";
  };

  const getStatusBadgeClass = (status) => {
    if (status === "APPROVED") return "status-approved";
    if (status === "REJECTED") return "status-rejected";
    if (status === "PENDING") return "status-pending";
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading branch audit data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="branch-audit-container space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Branch-level audit overview and activity monitoring
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}

      {/* Read-Only Indicator */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Read-Only / Supervisory Access
            </p>
            <p className="text-xs text-blue-700">
              Branch audit data is read-only. No configuration changes allowed.
            </p>
          </div>
        </div>
      </div>

      {/* Branch Overview Cards */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Branch Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {branches.map((branch) => (
            <div
              key={branch.branch_id}
              onClick={() => handleBranchSelect(branch.branch_id)}
              className={`branch-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
                selectedBranch === branch.branch_id ? "selected" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {branch.branch_id}
                  </p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">
                    {branch.branch_name}
                  </h4>
                </div>
                <span
                  className={`compliance-badge ${getComplianceBadgeClass(
                    branch.compliance_status
                  )}`}
                >
                  {branch.compliance_status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Accounts:</span>
                  <span className="font-semibold text-slate-900">
                    {branch.total_accounts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Transactions:</span>
                  <span className="font-semibold text-slate-900">
                    {branch.total_transactions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pending:</span>
                  <span className="font-semibold text-amber-600">
                    {branch.pending_approvals}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Volume:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{branch.transaction_volume.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Branch Activity Report */}
      {selectedBranch && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">
            Branch Activity Report
          </h3>

          {reportLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading branch report…</p>
            </div>
          ) : branchReport ? (
            <>
              {/* Transaction Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Transaction Summary
                </h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="metric-card rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {branchReport.transaction_summary.total}
                    </p>
                  </div>
                  <div className="metric-card rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Approved
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">
                      {branchReport.transaction_summary.approved}
                    </p>
                  </div>
                  <div className="metric-card rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-600">
                      Rejected
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-rose-700">
                      {branchReport.transaction_summary.rejected}
                    </p>
                  </div>
                  <div className="metric-card rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                      Pending
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-700">
                      {branchReport.transaction_summary.pending}
                    </p>
                  </div>
                  <div className="metric-card rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                      Approval Rate
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-indigo-700">
                      {branchReport.transaction_summary.approval_rate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Volume Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Volume Summary
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total Volume
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      ₹{branchReport.volume_summary.total_volume.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Average Transaction
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      ₹{branchReport.volume_summary.average_transaction.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Recent Transactions
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Transaction ID</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">From Account</th>
                        <th className="px-4 py-3">To Account</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchReport.recent_transactions.map((tx) => (
                        <tr key={tx.transaction_id} className="transaction-row">
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            {tx.transaction_id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            ₹{tx.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {tx.from_account_masked}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {tx.to_account_masked}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`status-badge ${getStatusBadgeClass(
                                tx.status
                              )}`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                      {branchReport.recent_transactions.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No recent transactions for this branch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">
                Select a branch to view detailed activity report.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Info Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> Branch audit provides read-only visibility into
          branch-level operations. Managers cannot modify branch configurations or
          access system-wide audit data. All customer identifiers are masked for
          privacy.
        </p>
      </div>
    </div>
  );
};

export default BranchAudit;
