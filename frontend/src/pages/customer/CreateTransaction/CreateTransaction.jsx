import React, { useMemo, useState } from "react";
import { createTransaction } from "../../../services/transactionService";
import { validateAmount, isRequired } from "../../../utils/validators";
import { useAuth } from "../../../context/AuthContext";
import { useRole } from "../../../context/RoleContext";
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
  const [form, setForm] = useState({ to_account: "", amount: "", purpose: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }));
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
        amount: Number(form.amount),
        purpose: form.purpose.trim(),
      };
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
      setForm({ to_account: "", amount: "", purpose: "" });
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
    <section className="panel transfer-form">
      <header>
        <h3>Transfer Money</h3>
        <p className="muted">
          Customers may move funds between accounts they own and approved
          beneficiaries. All transfers are recorded and monitored.
        </p>
      </header>

      <form onSubmit={handleSubmit} aria-busy={loading}>
        <label className="field">
          <span>Sender Account Number</span>
          <input
            type="text"
            name="from_account"
            value={senderAccount || "Not provisioned"}
            readOnly
          />
          {fieldErrors.sender && (
            <small className="field-error">{fieldErrors.sender}</small>
          )}
        </label>

        <label className="field">
          <span>Receiver Account Number</span>
          <input
            type="text"
            name="to_account"
            value={form.to_account}
            onChange={handleChange}
            placeholder="e.g. 91-002-ABCD1234"
            autoComplete="off"
            required
          />
          {fieldErrors.to_account && (
            <small className="field-error">{fieldErrors.to_account}</small>
          )}
        </label>

        <label className="field">
          <span>Amount (INR)</span>
          <input
            type="number"
            name="amount"
            min="1"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="Enter amount"
            required
          />
          {fieldErrors.amount && (
            <small className="field-error">{fieldErrors.amount}</small>
          )}
        </label>

        <label className="field">
          <span>Purpose</span>
          <textarea
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            placeholder="e.g. Tuition fee payment"
            rows={3}
            maxLength={240}
            required
          />
          <small className="muted">
            {(form.purpose || "").trim().length}/240 characters
          </small>
          {fieldErrors.purpose && (
            <small className="field-error">{fieldErrors.purpose}</small>
          )}
        </label>

        <button type="submit" disabled={loading || !senderAccount}>
          {loading ? "Submitting…" : "Initiate Transfer"}
        </button>
      </form>

      {serverError && (
        <p className="field-error" role="alert">
          {serverError}
        </p>
      )}

      {success && (
        <div className="success-banner" role="status">
          <p>{success.message}</p>
          <p className="muted">
            Reference: <strong>{success.reference}</strong> · Status:{" "}
            <strong>{success.status}</strong>
          </p>
        </div>
      )}
    </section>
  );
};

export default CreateTransaction;
