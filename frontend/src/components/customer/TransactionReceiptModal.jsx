import { useEffect } from "react";

const TransactionReceiptModal = ({ transaction, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const maskAccount = (accountNumber) => {
    if (!accountNumber) return '';
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return '****' + str.slice(-4);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'COMPLETED': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Completed' },
      'PENDING': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Pending Approval' },
      'APPROVED': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Approved' },
      'REJECTED': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', label: 'Rejected' }
    };
    const config = statusMap[status] || statusMap['PENDING'];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {config.label}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptContent = `
TRANSACTION RECEIPT
===================

Transaction ID: ${transaction.id}
Date & Time: ${formatDateTime(transaction.created_at)}
Status: ${transaction.status}

TRANSACTION DETAILS
-------------------
From Account: ${maskAccount(transaction.from_account)}
To Account: ${maskAccount(transaction.to_account)}
Amount: ${formatAmount(transaction.amount)}
Purpose: ${transaction.purpose}

${transaction.requires_manager_approval ? 'Note: This transaction requires manager approval.' : ''}

Generated on: ${new Date().toLocaleString('en-IN')}
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${transaction.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:bg-white"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-2xl print:shadow-none print:border-0">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 print:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 print:bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400 print:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
            Transaction Receipt
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Your transaction has been {transaction.status === 'COMPLETED' ? 'completed' : 'submitted'} successfully
          </p>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6 print:bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">Status</span>
            {getStatusBadge(transaction.status)}
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">Transaction ID</span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white print:text-slate-900">
              {transaction.id}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">Date & Time</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white print:text-slate-900">
              {formatDateTime(transaction.created_at)}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">From Account</span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white print:text-slate-900">
              {maskAccount(transaction.from_account)}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">To Account</span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white print:text-slate-900">
              {maskAccount(transaction.to_account)}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3 print:border-slate-200">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">Amount</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-600">
              {formatAmount(transaction.amount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 print:text-slate-600">Purpose</span>
            <span className="text-right text-sm font-semibold text-slate-900 dark:text-white print:text-slate-900">
              {transaction.purpose}
            </span>
          </div>
        </div>

        {transaction.requires_manager_approval && (
          <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 print:bg-amber-50">
            <div className="flex gap-3">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 print:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 print:text-amber-800">
                  Pending Manager Approval
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 print:text-amber-700">
                  This high-value transaction requires manager approval before processing.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 print:hidden">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-purple-700 print:hidden"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TransactionReceiptModal;
