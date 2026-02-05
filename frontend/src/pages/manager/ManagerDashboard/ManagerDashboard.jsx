import React, { useEffect, useState } from "react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { fetchManagerDashboard } from "../../../services/managerService";
import { decideOnTransaction } from "../../../services/managerService";
import "./ManagerDashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ManagerDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchManagerDashboard();
        setOverview(data || {});
        setError(null);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load manager dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setLoading(true);
      load();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex items-center gap-2 p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm font-medium text-rose-500">{error}</p>;
  }

  const pendingApprovals = overview?.pending_approvals || [];
  const branchInsights = overview?.branch_health || [];
  const riskFeed = overview?.risk_feed || [];
  const recentActions = overview?.recent_actions || [];
  const performanceMetrics = overview?.performance_metrics || {};

  // Chart data - Transaction trends (last 7 days)
  const transactionTrendData = {
    labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'],
    datasets: [
      {
        label: 'Approved',
        data: [12, 19, 15, 25, 22, 30, performanceMetrics?.approved_24h || 0],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Rejected',
        data: [3, 5, 2, 8, 5, 7, performanceMetrics?.rejected_24h || 0],
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Certificate status distribution
  const certificateStatusData = {
    labels: ['Active', 'Expiring Soon', 'Expired', 'Revoked'],
    datasets: [
      {
        data: [
          overview?.active_certificates || 0,
          overview?.expiring_certificates || 0,
          overview?.expired_certificates || 0,
          overview?.revoked_certificates || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(244, 63, 94, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  // Branch activity
  const branchActivityData = {
    labels: branchInsights.map(b => b.label || b.code).slice(0, 5),
    datasets: [
      {
        label: 'Pending',
        data: branchInsights.map(b => b.pending || 0).slice(0, 5),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
      },
      {
        label: 'Active Customers',
        data: branchInsights.map(b => b.active_customers || 0).slice(0, 5),
        backgroundColor: 'rgba(34, 211, 238, 0.8)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const handleQuickAction = async (txId, action) => {
    setActionLoading(prev => ({ ...prev, [txId]: true }));
    try {
      await decideOnTransaction(txId, { action });
      setError(null);
      // Refresh dashboard
      const data = await fetchManagerDashboard();
      setOverview(data || {});
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${action} transaction`);
    } finally {
      setActionLoading(prev => ({ ...prev, [txId]: false }));
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await fetchManagerDashboard();
      setOverview(data || {});
      setError(null);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load manager dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">
            Manager Operations Center
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Review pending approvals, monitor certificate posture, and keep an eye
            on branch anomalies.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Pending approvals
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {pendingApprovals.length}
          </h3>
          <p className="text-sm text-slate-500">
            {overview?.oldest_pending || "Queue is fresh"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            High risk flags
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.high_risk_count || 0}
          </h3>
          <p className="text-sm text-slate-500">
            {overview?.highest_risk_branch || "No alerts"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Certificates expiring
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.expiring_certificates || 0}
          </h3>
          <p className="text-sm text-slate-500">
            Next expiry: {overview?.next_expiry || "--"}
          </p>
        </article>
        <article className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
            Avg Approval Time
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-indigo-900">
            {performanceMetrics?.avg_approval_time_minutes || 0}m
          </h3>
          <p className="text-sm text-indigo-600">
            {performanceMetrics?.approval_rate || 0}% approval rate
          </p>
        </article>
      </section>

      {/* Performance Charts */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Performance Analytics</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Transaction Trends */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Transaction Approval Trends (7 Days)
            </h4>
            <div className="h-64">
              <Line data={transactionTrendData} options={chartOptions} />
            </div>
          </div>

          {/* Certificate Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Certificate Status Distribution
            </h4>
            <div className="h-64">
              <Doughnut 
                data={certificateStatusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Branch Activity Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Branch Activity Overview (Top 5)
          </h4>
          <div className="h-72">
            <Bar data={branchActivityData} options={chartOptions} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Pending approvals
          </h3>
          {pendingApprovals.length > 0 && (
            <a
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              href="/transactions/approvals"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
        {pendingApprovals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-slate-900">All caught up!</p>
            <p className="mt-1 text-sm text-slate-500">No pending transactions require approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingApprovals.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-mono text-xs">{entry.id?.substring(0, 8)}...</td>
                    <td className="px-4 py-3">{entry.branch?.label || entry.owner}</td>
                    <td className="px-4 py-3 font-semibold">
                      ₹ {Number(entry.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        entry.risk?.level === 'critical' ? 'bg-rose-100 text-rose-700' :
                        entry.risk?.level === 'elevated' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {entry.risk?.level || entry.flag || "normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleQuickAction(entry.id, 'approve')}
                          disabled={actionLoading[entry.id]}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading[entry.id] ? '...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleQuickAction(entry.id, 'reject')}
                          disabled={actionLoading[entry.id]}
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading[entry.id] ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Recent Actions</h3>
          {recentActions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">No actions in the last 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        action.action === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}></span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {action.action}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {action.transaction_id?.substring(0, 8)}...
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      ₹{Number(action.amount || 0).toLocaleString("en-IN")} transfer
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Performance (24h)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Processed
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceMetrics?.total_processed_24h || 0}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                ✓ {performanceMetrics?.approved_24h || 0} approved
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rejected
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceMetrics?.rejected_24h || 0}
              </p>
              <p className="mt-1 text-xs text-rose-600">
                ✗ Last 24 hours
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Branch health</h3>
        {branchInsights.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No branch activity detected</p>
            <p className="mt-1 text-xs text-slate-400">Branch metrics will appear when transactions are pending</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Stale</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {branchInsights.map((branch) => (
                  <tr key={branch.code || branch.label}>
                    <td className="px-4 py-3 font-semibold">{branch.label || branch.code}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{branch.pending || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      {branch.stale > 0 ? (
                        <span className="text-amber-600 font-semibold">{branch.stale}</span>
                      ) : (
                        <span className="text-slate-400">{branch.stale || 0}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        (branch.risk || branch.risk_level) === 'critical' ? 'bg-rose-100 text-rose-700' :
                        (branch.risk || branch.risk_level) === 'elevated' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {branch.risk || branch.risk_level || "normal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Risk feed</h3>
        {riskFeed.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="font-semibold text-emerald-900">All systems normal</p>
            <p className="mt-1 text-sm text-emerald-700">No risk alerts detected</p>
          </div>
        ) : (
          <ul className="space-y-3 text-slate-700">
            {riskFeed.map((alert) => (
              <li
                key={alert.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <strong className="text-slate-900">
                  {alert.title || alert.policy}
                </strong>
                <span className="text-slate-500">
                  {" "}
                  — {alert.detail || alert.summary}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ManagerDashboard;
