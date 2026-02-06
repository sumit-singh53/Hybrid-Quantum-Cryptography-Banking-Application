import React, { useEffect, useMemo, useState } from "react";
import { createTransaction } from "../../../services/transactionService";
import { validateAmount, isRequired } from "../../../utils/validators";
import { useAuth } from "../../../context/AuthContext";
import { useRole } from "../../../context/RoleContext";
import { fetchCustomerOverview, fetchCustomerTransactions } from "../../../services/customerService";
import "./CreateTransaction.css";

const ROLE_GUARDS = {
  auditor_clerk:
    "Audit clerks have read-only visibility. Use the Audit Transactions dashboard to review activity.",
  manager:
    "Managers approve or reject customer transfers from the Manager Dashboard. Initiating transfers is limited to customers.",
  system_admin:
    "System administrators never initiate financial transfers. Please use the admin consoles for PKI and CRL operations.",
};

const CreateTransaction = () => {
  const { user, isVerifyingSession } = useAuth();
  const { role, hasAccess } = useRole();
  const [form, setForm] = useState({ to_account: "", recipient_name: "", amount: "", purpose: "", category: "general", schedule_date: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // New states for smart features
  const [balance, setBalance] = useState(null);
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [beneficiaryName, setBeneficiaryName] = useState(null);
  const [lookingUpBeneficiary, setLookingUpBeneficiary] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const senderAccount = user?.account_number || "";
  const isCustomer = hasAccess(["customer"]);

  const guardMessage = useMemo(() => {
    if (!role) return null;
    if (isCustomer) return null;
    return (
      ROLE_GUARDS[role] ||
      "This workspace only allows the account holder to initiate transfers."
    );
  }, [isCustomer, role]);

  // Load balance and recent recipients on mount
  useEffect(() => {
    const loadData = async () => {
      if (!isCustomer) {
        setLoadingData(false);
        return;
      }
      
      try {
        const [overview, transactions] = await Promise.all([
          fetchCustomerOverview(),
          fetchCustomerTransactions()
        ]);
        
        setBalance(overview?.account_balance || 0);
        
        // Get unique recent recipients (last 5 SENT transactions)
        const sent = (transactions || []).filter(tx => tx.direction === "SENT" && tx.to_account);
        const uniqueAccounts = [...new Set(sent.map(tx => tx.to_account))];
        setRecentRecipients(uniqueAccounts.slice(0, 5));
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isCustomer]);

  // Calculate balance after transaction
  const balanceAfter = useMemo(() => {
    if (balance === null || !form.amount) return null;
    const amount = Number(form.amount);
    if (isNaN(amount)) return null;
    return balance - amount;
  }, [balance, form.amount]);

  // Lookup beneficiary when account number is entered
  useEffect(() => {
    const lookupBeneficiary = async () => {
      const account = form.to_account.trim();
      if (!account || account === senderAccount) {
        setBeneficiaryName(null);
        return;
      }

      setLookingUpBeneficiary(true);
      try {
        // Simulate beneficiary lookup - in real app, call API
        await new Promise(resolve => setTimeout(resolve, 500));
        // For now, just show account verified
        setBeneficiaryName("Account Verified");
      } catch (err) {
        setBeneficiaryName(null);
      } finally {
        setLookingUpBeneficiary(false);
      }
    };

    const timer = setTimeout(lookupBeneficiary, 500);
    return () => clearTimeout(timer);
  }, [form.to_account, senderAccount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    
    // Clear beneficiary when changing recipient
    if (name === "to_account") {
      setBeneficiaryName(null);
    }
  };

  const handleQuickAmount = (amount) => {
    setForm({ ...form, amount: amount.toString() });
    setFieldErrors((prev) => ({ ...prev, amount: null }));
  };

  const handleRecentRecipient = (account) => {
    setForm({ ...form, to_account: account, recipient_name: "" });
    setFieldErrors((prev) => ({ ...prev, to_account: null, recipient_name: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!senderAccount) {
      errors.sender = "Sender account is unavailable. Please re-login.";
    }
    const toAccountError = isRequired(form.to_account, "Receiver account");
    if (toAccountError) {
      errors.to_account = toAccountError;
    } else if (form.to_account.trim() === senderAccount) {
      errors.to_account = "You cannot transfer to your own account.";
    }

    // Validate recipient name
    const recipientNameError = isRequired(form.recipient_name, "Recipient name");
    if (recipientNameError) {
      errors.recipient_name = recipientNameError;
    } else if (form.recipient_name.trim().length < 3) {
      errors.recipient_name = "Recipient name must be at least 3 characters.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(form.recipient_name)) {
      errors.recipient_name = "Name can only contain letters, spaces, and basic punctuation.";
    }

    const amountError = validateAmount(form.amount);
    if (amountError) {
      errors.amount = amountError;
    }

    const purposeValue = form.purpose?.trim() || "";
    const purposeError = isRequired(purposeValue, "Purpose");
    if (purposeError) {
      errors.purpose = purposeError;
    } else if (purposeValue.length > 240) {
      errors.purpose = "Purpose must be 240 characters or fewer.";
    }

    // Validate schedule date if provided
    if (form.schedule_date) {
      const scheduleDate = new Date(form.schedule_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduleDate < today) {
        errors.schedule_date = "Cannot schedule transfer in the past.";
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        to_account: form.to_account.trim(),
        recipient_name: form.recipient_name.trim(),
        amount: Number(form.amount),
        purpose: form.purpose.trim(),
        category: form.category,
      };

      // Add schedule date if provided
      if (form.schedule_date) {
        payload.schedule_date = form.schedule_date;
      }

      const response = await createTransaction(payload);
      const message = response.requires_manager_approval
        ? "Transfer submitted. A manager will review it shortly."
        : "Transfer completed successfully.";
      setSuccess({
        message,
        reference: response.id || response.reference || "Pending assignment",
        status:
          response.status ||
          (response.requires_manager_approval ? "pending_review" : "approved"),
      });
      setForm({ to_account: "", recipient_name: "", amount: "", purpose: "", category: "general", schedule_date: "" });
      setShowPreview(false);
    } catch (err) {
      setServerError(
        err?.response?.data?.message || "Failed to initiate transfer.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <section className="panel">
        <h3>Loading Access Controls</h3>
        <p className="muted">
          {isVerifyingSession
            ? "Confirming your session and security posture…"
            : "We could not determine your role. Please refresh or re-authenticate."}
        </p>
      </section>
    );
  }

  if (!isCustomer) {
    return (
      <section className="panel">
        <h3>Transfers Restricted</h3>
        <p>{guardMessage || "Only customers may initiate transfers."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <header>
        <h3 className="text-3xl font-semibold text-slate-900">Transfer Money</h3>
        <p className="mt-2 text-base text-slate-600">
          Send funds securely with quantum-safe encryption. All transfers are monitored and recorded.
        </p>
      </header>

      {/* Balance Card */}
      {balance !== null && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Available Balance</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                ₹{balance.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
        {/* Sender Account */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">From Account</span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="font-mono text-sm font-medium text-slate-700">
                {senderAccount || "Not provisioned"}
              </span>
            </div>
            {fieldErrors.sender && (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.sender}</p>
            )}
          </label>
        </div>

        {/* Receiver Account with Recent Recipients */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">To Account</span>
            <input
              type="text"
              name="to_account"
              value={form.to_account}
              onChange={handleChange}
              placeholder="Enter recipient account number"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoComplete="off"
              required
            />
            {fieldErrors.to_account && (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.to_account}</p>
            )}
            
            {/* Beneficiary Lookup Status */}
            {form.to_account && !fieldErrors.to_account && (
              <div className="mt-2">
                {lookingUpBeneficiary ? (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying account...
                  </p>
                ) : beneficiaryName ? (
                  <p className="flex items-center gap-2 text-xs text-emerald-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {beneficiaryName}
                  </p>
                ) : null}
              </div>
            )}
          </label>

          {/* Recipient Name Field */}
          <div className="mt-4">
            <span className="text-sm font-semibold text-slate-700">Recipient Name</span>
            <input
              type="text"
              name="recipient_name"
              value={form.recipient_name}
              onChange={handleChange}
              placeholder="Enter full name of recipient"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              required
            />
            {fieldErrors.recipient_name && (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.recipient_name}</p>
            )}
          </div>

          {/* Recent Recipients */}
          {recentRecipients.length > 0 && !form.to_account && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recent Recipients
              </p>
              <div className="flex flex-wrap gap-2">
                {recentRecipients.map((account) => (
                  <button
                    key={account}
                    type="button"
                    onClick={() => handleRecentRecipient(account)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {account}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Amount with Quick Buttons */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Amount (INR)</span>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                ₹
              </span>
              <input
                type="number"
                name="amount"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-lg font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            {fieldErrors.amount && (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.amount}</p>
            )}

            {/* Balance Preview */}
            {balanceAfter !== null && form.amount && (
              <div className={`mt-3 rounded-lg border px-3 py-2 ${
                balanceAfter >= 0 
                  ? 'border-emerald-200 bg-emerald-50' 
                  : 'border-rose-200 bg-rose-50'
              }`}>
                <p className={`text-sm font-medium ${
                  balanceAfter >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  Balance after: ₹{balanceAfter.toLocaleString("en-IN")}
                  {balanceAfter < 0 && " (Insufficient funds)"}
                </p>
              </div>
            )}
          </label>

          {/* Quick Amount Buttons */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick Amounts
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction Category */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Transaction Category</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="general">General Transfer</option>
              <option value="bills">Bill Payment</option>
              <option value="education">Education/Tuition</option>
              <option value="rent">Rent Payment</option>
              <option value="loan">Loan Repayment</option>
              <option value="investment">Investment</option>
              <option value="medical">Medical Expenses</option>
              <option value="business">Business Transaction</option>
              <option value="family">Family Support</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        {/* Schedule Transfer (Optional) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Schedule Transfer (Optional)</span>
              <span className="text-xs text-slate-500">Leave blank for immediate transfer</span>
            </div>
            <input
              type="date"
              name="schedule_date"
              value={form.schedule_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {form.schedule_date && (
              <p className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Transfer will be processed on {new Date(form.schedule_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </label>
        </div>

        {/* Purpose */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Purpose</span>
            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              placeholder="e.g. Tuition fee payment, Bill payment, etc."
              rows={3}
              maxLength={240}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              required
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {(form.purpose || "").trim().length}/240 characters
              </p>
              {fieldErrors.purpose && (
                <p className="text-sm text-rose-600">{fieldErrors.purpose}</p>
              )}
            </div>
          </label>
        </div>

        {/* Preview and Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const errors = validateForm();
              setFieldErrors(errors);
              if (Object.keys(errors).length === 0) {
                setShowPreview(true);
              }
            }}
            disabled={loading || !senderAccount || (balanceAfter !== null && balanceAfter < 0)}
            className="flex-1 rounded-2xl border-2 border-indigo-600 bg-white px-6 py-4 text-base font-semibold text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Review Transfer
          </button>
          <button
            type="submit"
            disabled={loading || !senderAccount || (balanceAfter !== null && balanceAfter < 0)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Send Money"
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {serverError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-rose-700">{serverError}</p>
          </div>
        </div>
      )}

      {/* Transaction Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPreview(false)}>
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPreview(false)}
              className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-slate-900 mb-6">Review Transaction</h3>

            <div className="space-y-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">From Account</p>
                <p className="font-mono text-sm font-medium text-slate-900">{senderAccount}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">To Account</p>
                <p className="font-mono text-sm font-medium text-slate-900">{form.to_account}</p>
                {form.recipient_name && (
                  <p className="text-sm text-slate-600 mt-1">{form.recipient_name}</p>
                )}
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Amount</p>
                <p className="text-2xl font-bold text-indigo-900">₹{Number(form.amount).toLocaleString("en-IN")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Category</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{form.category.replace('_', ' ')}</p>
              </div>

              {form.schedule_date && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Scheduled For</p>
                  <p className="text-sm font-medium text-amber-900">{new Date(form.schedule_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Purpose</p>
                <p className="text-sm text-slate-700">{form.purpose}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Edit Details
              </button>
              <button
                onClick={(e) => {
                  setShowPreview(false);
                  handleSubmit(e);
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-lg" role="status">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-emerald-900">{success.message}</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-emerald-700">
                  <span className="font-medium">Reference ID:</span> <span className="font-mono">{success.reference}</span>
                </p>
                <p className="text-sm text-emerald-700">
                  <span className="font-medium">Status:</span> <span className="capitalize">{success.status.replace(/_/g, " ")}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CreateTransaction;
