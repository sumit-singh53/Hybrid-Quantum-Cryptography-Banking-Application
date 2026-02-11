import { useEffect } from "react";

const TransactionConfirmModal = ({ 
  transactionData, 
  beneficiaryInfo, 
  onConfirm, 
  onCancel, 
  loading = false 
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const maskAccount = (accountNumber) => {
    if (!accountNumber) return '';
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return '****' + str.slice(-4);
  };
  
  // Get the final purpose (use customPurpose if purpose is "Other")
  const displayPurpose = transactionData.purpose === "Other" 
    ? transactionData.customPurpose 
    : transactionData.purpose;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Confirm Transaction
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Please review the details before proceeding
          </p>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Beneficiary</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {beneficiaryInfo?.beneficiary_name || 'Unknown'}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Account Number</span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
              {maskAccount(beneficiaryInfo?.account_number)}
            </span>
          </div>

          {beneficiaryInfo?.bank_name && (
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Bank</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {beneficiaryInfo.bank_name}
              </span>
            </div>
          )}

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Amount</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatAmount(transactionData.amount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Purpose</span>
            <span className="text-right text-sm font-semibold text-slate-900 dark:text-white">
              {displayPurpose}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              This transaction will be processed immediately. Please ensure all details are correct before confirming.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Confirm & Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionConfirmModal;
