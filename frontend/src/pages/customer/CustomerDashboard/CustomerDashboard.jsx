import React, { useEffect, useState } from "react";
import "./CustomerDashboard.css";
import { Link } from "react-router-dom";
import { fetchCustomerOverview } from "../../../services/customerService";
import { getTransactionHistory } from "../../../services/transactionService";
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CustomerDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      if (!loading) setRefreshing(true);
      const [overviewResult, historyResult] = await Promise.allSettled([
        fetchCustomerOverview(),
        getTransactionHistory(),
      ]);

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
        setError(null);
      } else {
        throw overviewResult.reason;
      }

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value || []);
        setHistoryError(null);
      } else {
        setHistory([]);
        setHistoryError(
          historyResult.reason?.response?.data?.message ||
            "Unable to load recent transactions",
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load dashboard insights",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate spending trends for last 7 days
  const getSpendingTrends = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sent: 0,
        received: 0
      });
    }

    history.forEach(tx => {
      const txDate = new Date(tx.created_at).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.date === txDate);
      if (dayData) {
        if (tx.direction === 'SENT') {
          dayData.sent += parseFloat(tx.amount || 0);
        } else {
          dayData.received += parseFloat(tx.amount || 0);
        }
      }
    });

    return last7Days;
  };

  // Calculate transaction breakdown
  const getTransactionBreakdown = () => {
    const breakdown = {
      sent: 0,
      received: 0,
      pending: 0
    };

    history.forEach(tx => {
      if (tx.status === 'PENDING' || tx.status === 'pending_review') {
        breakdown.pending++;
      } else if (tx.direction === 'SENT') {
        breakdown.sent++;
      } else {
        breakdown.received++;
      }
    });

    return breakdown;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          <p className="text-slate-600">Gathering your secure dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  const trends = getSpendingTrends();
  const breakdown = getTransactionBreakdown();
  const recentTransactions = history.slice(0, 5).map((tx) => ({
    ...tx,
    counterparty: tx.direction === "SENT" ? tx.to_account : tx.from_account,
  }));

  const certificateStatus = overview?.certificate?.status || "Unknown";
  const certificateExpires = overview?.certificate?.valid_to || "--";
  const daysUntilExpiry = certificateExpires !== "--" ? 
    Math.ceil((new Date(certificateExpires) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Chart configurations
  const spendingTrendData = {
    labels: trends.map(d => d.label),
    datasets: [
      {
        label: 'Sent',
        data: trends.map(d => d.sent),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Received',
        data: trends.map(d => d.received),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const breakdownData = {
    labels: ['Sent', 'Received', 'Pending'],
    datasets: [{
      data: [breakdown.sent, breakdown.received, breakdown.pending],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)'
      ],
      borderColor: [
        'rgb(239, 68, 68)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)'
      ],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome Back! 👋
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Here's your account overview and recent activity
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:bg-cyan-600 disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Balance Card */}
        <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Account Balance
            </h4>
            <div className="rounded-full bg-cyan-100 p-2 text-cyan-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            ₹{overview?.account_balance?.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Indian Rupees (INR)
          </p>
        </div>

        {/* Certificate Card */}
        <div className={`group rounded-2xl border p-6 shadow-lg transition-all hover:shadow-xl ${
          daysUntilExpiry && daysUntilExpiry < 30 
            ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/30' 
            : 'border-slate-200 bg-gradient-to-br from-white to-emerald-50/30'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Certificate
            </h4>
            <div className={`rounded-full p-2 ${
              daysUntilExpiry && daysUntilExpiry < 30 
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-emerald-100 text-emerald-600'
            }`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900 capitalize">
            {certificateStatus}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {daysUntilExpiry !== null ? 
              `${daysUntilExpiry > 0 ? `Expires in ${daysUntilExpiry} days` : 'Expired'}` 
              : 'No expiry data'}
          </p>
        </div>

        {/* Total Transactions */}
        <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Transactions
            </h4>
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {history.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {breakdown.pending} pending approval
          </p>
        </div>

        {/* Pending Count */}
        <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/30 p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Pending
            </h4>
            <div className="rounded-full bg-amber-100 p-2 text-amber-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {breakdown.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting manager approval
          </p>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Spending Trends */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900">
            Spending Trends (Last 7 Days)
          </h3>
          <p className="text-sm text-slate-500">Track your daily transactions</p>
          <div className="mt-4 h-64">
            <Line data={spendingTrendData} options={chartOptions} />
          </div>
        </div>

        {/* Transaction Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900">
            Transaction Breakdown
          </h3>
          <p className="text-sm text-slate-500">Distribution by type</p>
          <div className="mt-4 h-64">
            <Doughnut data={breakdownData} options={doughnutOptions} />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/transactions/create"
            className="group flex items-center gap-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-500 to-sky-600 p-4 text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40"
          >
            <div className="rounded-lg bg-white/20 p-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">New Transfer</p>
              <p className="text-xs text-cyan-100">Send money</p>
            </div>
          </Link>

          <Link
            to="/transactions/history"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-lg"
          >
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">View History</p>
              <p className="text-xs text-slate-500">All transactions</p>
            </div>
          </Link>

          <Link
            to="/security"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-lg"
          >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Security</p>
              <p className="text-xs text-slate-500">Manage access</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-lg"
          >
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Profile</p>
              <p className="text-xs text-slate-500">Account settings</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Transactions
            </h3>
            <p className="text-sm text-slate-500">Your latest 5 transactions</p>
          </div>
          <Link
            to="/transactions/history"
            className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
          >
            View all →
          </Link>
        </div>
        {historyError && (
          <p className="text-sm font-medium text-rose-600">{historyError}</p>
        )}
        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-2 text-sm text-slate-500">No transactions yet</p>
            <Link
              to="/transactions/create"
              className="mt-4 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              Create your first transaction
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        tx.direction === 'SENT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {tx.direction === 'SENT' ? '↑' : '↓'} {tx.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{tx.counterparty || "--"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">₹{tx.amount?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        tx.status === 'APPROVED' || tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        tx.status === 'PENDING' || tx.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                        tx.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerDashboard;
