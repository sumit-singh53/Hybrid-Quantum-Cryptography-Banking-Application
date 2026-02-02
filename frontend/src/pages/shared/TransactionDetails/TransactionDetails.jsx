import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTransactionDetails } from "../../../services/transactionService";
import "./TransactionDetails.css";

const TransactionDetails = () => {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);

  const loadDetails = useCallback(async () => {
    try {
      const data = await getTransactionDetails(id);
      setTx(data);
      setError(null);
    } catch {
      setError("Failed to load transaction details");
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (error)
    return (
      <section className="panel">
        <p className="field-error" role="alert">
          {error}
        </p>
      </section>
    );
  if (!tx)
    return (
      <section className="panel">
        <p className="muted">Loading transaction…</p>
      </section>
    );

  const directionBadge = (
    <span
      className={`badge ${tx.direction === "SENT" ? "badge-out" : "badge-in"}`}
    >
      {tx.direction === "SENT" ? "Sent" : "Received"}
    </span>
  );

  return (
    <section className="panel transaction-details">
      <header>
        <h3>Transaction Details</h3>
        <p className="muted">Immutable audit entry for ID {tx.id}</p>
      </header>

      <div className="detail-grid">
        <div>
          <span className="muted">Direction</span>
          <div>{directionBadge}</div>
        </div>
        <div>
          <span className="muted">
            {tx.direction === "SENT" ? "Sent To" : "Received From"}
          </span>
          <strong>
            {tx.direction === "SENT" ? tx.to_account : tx.from_account}
          </strong>
        </div>
        <div>
          <span className="muted">Amount</span>
          <strong>₹{Number(tx.amount).toLocaleString("en-IN")}</strong>
        </div>
        <div>
          <span className="muted">Status</span>
          <span
            className={`pill pill-${tx.status?.toLowerCase() || "unknown"}`}
          >
            {tx.status}
          </span>
        </div>
        <div>
          <span className="muted">Purpose</span>
          <p>{tx.purpose || "—"}</p>
        </div>
        <div>
          <span className="muted">Created</span>
          <p>
            {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <span className="muted">Approved</span>
          <p>
            {tx.approved_at
              ? new Date(tx.approved_at).toLocaleString()
              : "Pending"}
          </p>
        </div>
        <div>
          <span className="muted">Reference</span>
          <p>{tx.id}</p>
        </div>
      </div>
    </section>
  );
};

export default TransactionDetails;
