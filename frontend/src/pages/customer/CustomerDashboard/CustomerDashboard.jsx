import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCustomerOverview, fetchSecurityStatus } from "../../../services/customerService";
import { getTransactionHistory } from "../../../services/transactionService";

const CustomerDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [securityStatus, setSecurityStatus] = useState(null);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  // Get customer first name
  const getCustomerName = () => {
    if (!overview) return "";
    const fullName = overview.full_name || overview.name || "";
    return fullName.split(" ")[0] || "";
  };

  const loadData = async () => {
    try {
      if (!loading) setRefreshing(true);
      const [overviewResult, historyResult, securityResult] = await Promise.allSettled([
        fetchCustomerOverview(),
        getTransactionHistory(),
        fetchSecurityStatus(),
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

      if (securityResult.status === "fulfilled") {
        setSecurityStatus(securityResult.value);
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

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-600 mb-1">{getGreeting()}</p>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome Back, {getCustomerName() || "Customer"}! 👋
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

      {/* Quick Actions */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/transactions/create"
            className="group flex items-center gap-4 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-500 to-sky-600 p-5 text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40"
          >
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">Transfer Money</p>
              <p className="text-sm text-cyan-100">Send money quickly and securely</p>
            </div>
          </Link>

          <Link
            to="/transactions/history"
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:bg-slate-50 hover:shadow-lg"
          >
            <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">View Transactions</p>
              <p className="text-sm text-slate-500">Review your transaction history</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Security Status */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Security Status
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Login Verification */}
          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Login Verified</p>
                <p className="text-xs text-slate-500">Certificate authenticated</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-700">Active session</span>
            </div>
          </div>

          {/* Encryption Status */}
          <div className="rounded-xl border border-cyan-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Encryption Active</p>
                <p className="text-xs text-slate-500">{securityStatus?.encryption?.type || 'PQ + RSA hybrid'}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-cyan-50 px-3 py-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Algorithm:</span>
                <span className="font-mono font-semibold text-cyan-700">{securityStatus?.encryption?.algorithm || 'ML-KEM + RSA'}</span>
              </div>
            </div>
          </div>

          {/* Last Login */}
          <div className="rounded-xl border border-indigo-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Last Login</p>
                <p className="text-xs text-slate-500">Session tracking</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Time:</span>
                <span className="font-medium text-slate-900">
                  {securityStatus?.last_login?.timestamp 
                    ? new Date(securityStatus.last_login.timestamp).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : 'Just now'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Location:</span>
                <span className="font-medium text-slate-900">
                  {securityStatus?.last_login?.city 
                    ? `${securityStatus.last_login.city}, ${securityStatus.last_login.country || ''}`
                    : securityStatus?.last_login?.ip || 'Secure Portal'}
                </span>
              </div>
            </div>
          </div>

          {/* Device Binding Status */}
          <div className={`rounded-xl border p-4 ${
            securityStatus?.device_state?.requires_reverify 
              ? 'border-amber-200 bg-amber-50' 
              : 'border-purple-200 bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                securityStatus?.device_state?.requires_reverify 
                  ? 'bg-amber-100' 
                  : 'bg-purple-100'
              }`}>
                <svg className={`h-5 w-5 ${
                  securityStatus?.device_state?.requires_reverify 
                    ? 'text-amber-600' 
                    : 'text-purple-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Device Binding</p>
                <p className="text-xs text-slate-500">
                  {securityStatus?.device_state?.bound ? 'Device registered' : 'Not bound'}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {securityStatus?.device_state?.requires_reverify ? (
                <div className="rounded-lg bg-amber-100 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-800">⚠️ Device Mismatch Detected</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Device:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {securityStatus?.device_state?.device_label || 
                       (securityStatus?.device_state?.enrolled_device_id?.substring(0, 8) + '...' || 'None')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
                    <span className="text-xs font-medium text-purple-700">Verified</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Certificate Expiry */}
          <div className={`rounded-xl border p-4 ${
            securityStatus?.certificate?.status === 'Expired' 
              ? 'border-red-200 bg-red-50'
              : securityStatus?.certificate?.status === 'Expiring Soon'
              ? 'border-amber-200 bg-amber-50'
              : 'border-teal-200 bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                securityStatus?.certificate?.status === 'Expired'
                  ? 'bg-red-100'
                  : securityStatus?.certificate?.status === 'Expiring Soon'
                  ? 'bg-amber-100'
                  : 'bg-teal-100'
              }`}>
                <svg className={`h-5 w-5 ${
                  securityStatus?.certificate?.status === 'Expired'
                    ? 'text-red-600'
                    : securityStatus?.certificate?.status === 'Expiring Soon'
                    ? 'text-amber-600'
                    : 'text-teal-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Certificate</p>
                <p className="text-xs text-slate-500">{securityStatus?.certificate?.status || 'Valid'}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Expires:</span>
                <span className="font-medium text-slate-900">
                  {securityStatus?.certificate?.valid_to 
                    ? new Date(securityStatus.certificate.valid_to).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'N/A'}
                </span>
              </div>
              {securityStatus?.certificate?.status === 'Valid' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
                  <span className="text-xs font-medium text-teal-700">Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Security Alerts */}
          <div className={`rounded-xl border p-4 ${
            securityStatus?.security_events?.total_count > 0 
              ? 'border-orange-200 bg-orange-50' 
              : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                securityStatus?.security_events?.total_count > 0 
                  ? 'bg-orange-100' 
                  : 'bg-slate-100'
              }`}>
                <svg className={`h-5 w-5 ${
                  securityStatus?.security_events?.total_count > 0 
                    ? 'text-orange-600' 
                    : 'text-slate-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Security Alerts</p>
                <p className="text-xs text-slate-500">Event monitoring</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {securityStatus?.security_events?.total_count > 0 ? (
                <>
                  <div className="rounded-lg bg-orange-100 px-3 py-2">
                    <p className="text-xs font-semibold text-orange-800">
                      {securityStatus.security_events.total_count} alert{securityStatus.security_events.total_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">Review security events</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-medium text-emerald-700">No alerts</span>
                  </div>
                  <p className="text-xs text-slate-600">All systems secure</p>
                </>
              )}
            </div>
          </div>
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
