import React, { useEffect, useState } from "react";
import { getAllTransactions } from "../../../services/transactionService";
import {
  fetchTransactionSummary,
  verifyTransactionIntegrity,
} from "../../../services/auditorClerkService";
import "./AuditTransactions.css";

const AuditTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [verificationMap, setVerificationMap] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [txData, summaryData] = await Promise.all([
          getAllTransactions(),
          fetchTransactionSummary(),
        ]);
        setTransactions(txData || []);
        setSummary(summaryData);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to download transactions",
        );
      }
    };

    loadData();
  }, []);

  const handleVerify = async (txId) => {
    setVerificationMap((prev) => ({ ...prev, [txId]: { loading: true } }));
    try {
      const result = await verifyTransactionIntegrity(txId);
      setVerificationMap((prev) => ({
        ...prev,
        [txId]: { loading: false, result },
      }));
    } catch (err) {
      setVerificationMap((prev) => ({
        ...prev,
        [txId]: {
          loading: false,
          error: err?.response?.data?.message || "Verification failed",
        },
      }));
    }
  };

  if (error) {
    return <p className="text-sm font-medium text-rose-500">{error}</p>;
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">
          Audit Transactions
        </h2>
        <p className="mt-2 text-base text-slate-400">
          Full ledger visibility without the power to modify records.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-50">
          Daily Summary (Read-only)
        </h3>
        {summary?.daily_summary ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
              <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {summary.daily_summary.map((day) => (
                  <tr key={day.date}>
                    <td className="px-4 py-3">{day.date}</td>
                    <td className="px-4 py-3">{day.count}</td>
                    <td className="px-4 py-3">{day.approved}</td>
                    <td className="px-4 py-3">{day.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No recent transactions.</p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-50">
          Ledger (Read-only)
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transactions.map((tx) => {
                const verification = verificationMap[tx.id];
                return (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {tx.id}
                    </td>
                    <td className="px-4 py-3">{tx.from_user}</td>
                    <td className="px-4 py-3">{tx.to_account}</td>
                    <td className="px-4 py-3">₹ {tx.amount}</td>
                    <td className="px-4 py-3 capitalize">{tx.status}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleVerify(tx.id)}
                        disabled={verification?.loading}
                        className="rounded-2xl border border-indigo-400/40 px-4 py-1.5 text-xs font-semibold text-indigo-200 transition hover:border-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {verification?.loading
                          ? "Verifying..."
                          : "Verify integrity"}
                      </button>
                      {verification?.error && (
                        <p className="mt-2 text-xs text-rose-400">
                          {verification.error}
                        </p>
                      )}
                      {verification?.result && (
                        <small className="mt-2 block font-mono text-xxs text-slate-400">
                          Hash: {verification.result.integrity_hash}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AuditTransactions;
