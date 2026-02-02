import React, { useEffect, useState } from "react";
import "./AccountsOverview.css";
import {
  fetchCustomerAccounts,
  fetchCustomerTransactions,
} from "../../../services/customerService";

const AccountsOverview = () => {
  const [accountsData, setAccountsData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [accounts, transactions] = await Promise.all([
          fetchCustomerAccounts(),
          fetchCustomerTransactions(),
        ]);
        setAccountsData(accounts);
        setRecentTransactions(transactions || []);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load account information",
        );
      }
    };

    loadAccounts();
  }, []);

  if (error) {
    return <p className="text-sm font-medium text-rose-600">{error}</p>;
  }

  if (!accountsData) {
    return <p>Preparing account overview...</p>;
  }

  const balance =
    accountsData.aggregate_balance?.toLocaleString("en-IN") || "0";

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Accounts</h2>
        <p className="mt-2 text-base text-slate-600">
          Review every account tied to your hybrid certificate identity.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Total Balance
          </h4>
          <p className="mt-3 text-4xl font-semibold text-slate-900">
            ₹ {balance}
          </p>
          <p className="text-sm text-slate-500">
            {accountsData.currency || "INR"}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Linked Accounts
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Account Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(accountsData.accounts || []).map((account) => (
                <tr key={account.account_number}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {account.account_number}
                  </td>
                  <td className="px-4 py-3 capitalize">{account.type}</td>
                  <td className="px-4 py-3 capitalize">{account.status}</td>
                  <td className="px-4 py-3">{account.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Recent Activity
        </h3>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">No recent debits.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {tx.to_account}
                    </td>
                    <td className="px-4 py-3">₹ {tx.amount}</td>
                    <td className="px-4 py-3 capitalize">{tx.status}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(tx.created_at).toLocaleString()}
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

export default AccountsOverview;
