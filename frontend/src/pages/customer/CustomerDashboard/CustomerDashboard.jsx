import { useEffect, useState } from "react";
import "./CustomerDashboard.css";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
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

// Utility function to mask account numbers
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 8) return accountNumber;
  const visible = accountNumber.slice(-4);
  const masked = '•'.repeat(accountNumber.length - 4);
  return `${masked}${visible}`;
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);

  // Security check - ensure only customers can access
  useEffect(() => {
    if (user && user.role && user.role.toLowerCase() !== 'customer') {
      setError('Unauthorized: This dashboard is for customers only');
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      if (!loading) setRefreshing(true);
      
      // Fetch overview and history
      const [overviewResult, historyResult] = await Promise.allSettled([
        fetchCustomerOverview(),
        getTransactionHistory(),
      ]);

      // Handle overview result
      if (overviewResult.status === "fulfilled") {
        console.log("Overview loaded successfully:", overviewResult.value);
        setOverview(overviewResult.value);
        setError(null);
      } else {
        console.error("Overview fetch failed:", overviewResult.reason);
        // Set a more user-friendly error message
        const errorMsg = overviewResult.reason?.response?.data?.message || 
                        overviewResult.reason?.message || 
                        "Unable to load dashboard insights";
        setError(errorMsg);
      }

      // Handle history result
      if (historyResult.status === "fulfilled") {
        console.log("History loaded successfully:", historyResult.value);
        setHistory(historyResult.value || []);
        setHistoryError(null);
      } else {
        console.error("History fetch failed:", historyResult.reason);
        setHistory([]);
        setHistoryError(
          historyResult.reason?.response?.data?.message ||
            "Unable to load recent transactions",
        );
      }
    } catch (err) {
      console.error("Unexpected error in loadData:", err);
      setError(
        err?.response?.data?.message || err?.message || "Unable to load dashboard insights",
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
            Welcome Back, {user?.name || 'Customer'}! 👋
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Here's your secure account overview and recent activity
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

      {/* Account Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/20 to-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-4">
              Primary Account
            </h3>
            <div className="space-y-3">
              {overview?.accounts?.map((account, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Account Number</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg font-semibold text-slate-900">
                        {showFullAccount ? account.account_number : maskAccountNumber(account.account_number)}
                      </p>
                      <button
                        onClick={() => setShowFullAccount(!showFullAccount)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title={showFullAccount ? "Hide account number" : "Show account number"}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showFullAccount ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Account Type</p>
                    <p className="text-sm font-semibold text-slate-700">{account.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      account.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {account.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      {/* Security Information */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Security Status
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Your account is protected with quantum-safe encryption and certificate-based authentication
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Last Login */}
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Login</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {overview?.last_login?.timestamp ? 
                    new Date(overview.last_login.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 
                    'First login'
                  }
                </p>
                {overview?.last_login?.city && (
                  <p className="text-xs text-slate-500 mt-1">
                    {overview.last_login.city}, {overview.last_login.country}
                  </p>
                )}
              </div>

              {/* Session Status */}
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session</p>
                </div>
                <p className="text-sm font-semibold text-emerald-700">Active & Secure</p>
                <p className="text-xs text-slate-500 mt-1">
                  Device: {overview?.device_state?.session_device_id?.slice(0, 8) || 'Unknown'}...
                </p>
              </div>

              {/* Encryption Status */}
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encryption</p>
                </div>
                <p className="text-sm font-semibold text-emerald-700">Quantum-Safe Active</p>
                <p className="text-xs text-slate-500 mt-1">ML-KEM + RSA Hybrid</p>
              </div>
            </div>
            {overview?.device_state?.requires_reverify && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Device Verification Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Your session device doesn't match your enrolled device. Please re-verify for enhanced security.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            to="/customer/transfer"
            className="group flex items-center gap-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-500 to-sky-600 p-4 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/40 no-underline"
          >
            <div className="rounded-lg bg-white/20 p-2 transition-transform group-hover:scale-110">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold no-underline">Transfer Money</p>
              <p className="text-xs text-cyan-100 no-underline">Send funds</p>
            </div>
          </Link>

          <Link
            to="/customer/beneficiaries"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:scale-105 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg no-underline"
          >
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 transition-all group-hover:bg-purple-200 group-hover:scale-110">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 no-underline">Beneficiaries</p>
              <p className="text-xs text-slate-500 no-underline">Manage payees</p>
            </div>
          </Link>

          <Link
            to="/customer/transactions"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:scale-105 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-lg no-underline"
          >
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 transition-all group-hover:bg-indigo-200 group-hover:scale-110">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 no-underline">History</p>
              <p className="text-xs text-slate-500 no-underline">All transactions</p>
            </div>
          </Link>

          <Link
            to="/statements/download"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:scale-105 hover:border-amber-300 hover:bg-amber-50 hover:shadow-lg no-underline"
          >
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 transition-all group-hover:bg-amber-200 group-hover:scale-110">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 no-underline">Statement</p>
              <p className="text-xs text-slate-500 no-underline">Download PDF</p>
            </div>
          </Link>

          <Link
            to="/customer/security"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:scale-105 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-lg no-underline"
          >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 transition-all group-hover:bg-emerald-200 group-hover:scale-110">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 no-underline">Security</p>
              <p className="text-xs text-slate-500 no-underline">Manage access</p>
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
            to="/customer/transactions"
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
              to="/customer/transfer"
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
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {maskAccountNumber(tx.counterparty || "--")}
                    </td>
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
