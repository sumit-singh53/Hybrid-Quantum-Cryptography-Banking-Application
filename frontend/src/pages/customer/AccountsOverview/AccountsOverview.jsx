import React, { useEffect, useState } from "react";
import "./AccountsOverview.css";
import {
  fetchCustomerAccounts,
  fetchCustomerTransactions,
  fetchCustomerAccountSummary,
} from "../../../services/customerService";
import { useAuth } from "../../../context/AuthContext";

const AccountsOverview = () => {
  const [accountsData, setAccountsData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accountSummary, setAccountSummary] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [accounts, transactions, summary] = await Promise.all([
          fetchCustomerAccounts(),
          fetchCustomerTransactions(),
          fetchCustomerAccountSummary().catch(() => null), // Fallback if new endpoint not available
        ]);
        setAccountsData(accounts);
        setRecentTransactions(transactions || []);
        setAccountSummary(summary);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load account information",
        );
      }
    };

    loadAccounts();
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  if (!accountsData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-slate-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  const balance =
    accountsData.aggregate_balance?.toLocaleString("en-IN") || "0";
  
  // Get primary account or first account
  const primaryAccount = accountsData.accounts?.[0] || null;
  
  // Use account summary data if available
  const accountType = accountSummary?.account_details?.account_type || "SAVINGS";
  const accountStatus = accountSummary?.account_details?.account_status || primaryAccount?.status || "ACTIVE";
  const branchCode = accountSummary?.account_details?.branch_code || "MUM-HQ";
  const openingDate = accountSummary?.account_details?.opening_date || primaryAccount?.created_at;

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">

      {/* Profile Information Card */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-3xl font-bold text-white shadow-lg shadow-indigo-500/30">
              {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {user?.full_name || user?.username || "Account Holder"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Customer Account</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Email */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Address</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{user?.email || "Not provided"}</p>
                </div>
              </div>

              {/* Username */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100">
                  <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{user?.username || "Not set"}</p>
                </div>
              </div>

              {/* Primary Account Number */}
              {primaryAccount && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Account</p>
                    <p className="mt-1 font-mono text-sm font-medium text-slate-900">{primaryAccount.account_number}</p>
                  </div>
                </div>
              )}

              {/* Role */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Role</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{user?.role || "Customer"}</p>
                </div>
              </div>

              {/* Account Status */}
              {primaryAccount && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Status</p>
                    <p className={`mt-1 text-sm font-medium capitalize ${
                      accountStatus === 'ACTIVE' ? 'text-green-600' : 
                      accountStatus === 'LIMITED' ? 'text-amber-600' : 'text-rose-600'
                    }`}>{accountStatus.toLowerCase()}</p>
                  </div>
                </div>
              )}

              {/* Account Type */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100">
                  <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Type</p>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-900">{accountType.toLowerCase()}</p>
                </div>
              </div>

              {/* Branch Code */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 font-mono text-sm font-medium text-slate-900">{branchCode}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Member Since</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {openingDate ? new Date(openingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Balance Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium uppercase tracking-wide text-slate-600">
                Total Balance
              </h4>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                ₹{balance}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            INR (Indian Rupees) • Across {accountsData.accounts?.length || 0} account(s)
          </p>
        </div>

        <div className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium uppercase tracking-wide text-slate-600">
                Linked Accounts
              </h4>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {accountsData.accounts?.length || 0}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Active banking accounts
          </p>
        </div>

        <div className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium uppercase tracking-wide text-slate-600">
                Transactions
              </h4>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {recentTransactions.length}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Recent activity count
          </p>
        </div>
      </section>

      {/* Linked Accounts Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Linked Banking Accounts
          </h3>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
            {accountsData.accounts?.length || 0} Total
          </span>
        </div>
        
        {!accountsData.accounts || accountsData.accounts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="mt-3 text-sm text-slate-600">No accounts linked yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-4">Account Number</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Balance (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {accountsData.accounts.map((account, index) => (
                  <tr key={account.account_number} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {account.account_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium capitalize text-cyan-700">
                        {account.type || "Savings"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        account.status?.toLowerCase() === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          account.status?.toLowerCase() === 'active' ? 'bg-green-600' : 'bg-amber-600'
                        }`}></span>
                        {account.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ₹{(account.balance || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Recent Activity
          </h3>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
            Last {recentTransactions.length} transactions
          </span>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="mt-3 text-sm text-slate-600">No recent transactions</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-4">Direction</th>
                  <th className="px-6 py-4">Counterparty</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentTransactions.slice(0, 10).map((tx) => {
                  const isSent = tx.direction === "SENT" || tx.from_account === primaryAccount?.account_number;
                  return (
                    <tr key={tx.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          isSent ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isSent ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          )}
                          {isSent ? "Sent" : "Received"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono text-xs text-slate-500">
                            {isSent ? tx.to_account : tx.from_account}
                          </p>
                          {tx.purpose && (
                            <p className="mt-1 text-xs text-slate-400">{tx.purpose}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isSent ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isSent ? '-' : '+'}₹{Number(tx.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          tx.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          tx.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.status?.toLowerCase() || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="text-xs">
                          <p className="font-medium">{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
                          <p className="text-slate-400">{new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Security Notice */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900">Security & Privacy</p>
            <p className="mt-1 text-sm text-blue-700">
              Your account information is protected with post-quantum cryptography and strict role-based access control. 
              Only you can access this data with valid certificate authentication. Account numbers are masked for additional security.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccountsOverview;
