import React, { useEffect, useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./CRLPanel.css";

const defaultSnapshot = { revoked: [], metadata: {} };

const CRLPanel = ({ initialSnapshot, onChange, sectionId }) => {
  const [snapshot, setSnapshot] = useState(initialSnapshot || defaultSnapshot);
  const [form, setForm] = useState({
    certificateId: "",
    reason: "Operational policy violation",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (initialSnapshot) {
      setSnapshot(initialSnapshot);
    }
  }, [initialSnapshot]);

  const refreshSnapshot = async () => {
    setBusy(true);
    try {
      const data = await systemAdminService.getCRL();
      setSnapshot(data);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.certificateId) return;
    setBusy(true);
    setMessage(null);
    try {
      await systemAdminService.revokeCertificate({
        certificate_id: form.certificateId.trim(),
        reason: form.reason.trim() || "Security policy violation",
      });
      setForm({ ...form, certificateId: "" });
      await refreshSnapshot();
      if (onChange) {
        onChange();
      }
      setMessage({ type: "success", text: "Certificate added to CRL" });
    } catch (err) {
      const text = err?.response?.data?.message || err.message;
      setMessage({ type: "error", text: text || "Unable to update CRL" });
    } finally {
      setBusy(false);
    }
  };

  const revokedEntries = snapshot?.revoked || [];
  const metadata = snapshot?.metadata || {};

  return (
    <div id={sectionId} className="sys-card">
      <h3 className="sys-section-title">CRL oversight</h3>
      <form className="sys-form" onSubmit={handleSubmit}>
        <label>
          Certificate ID
          <input
            name="certificateId"
            placeholder="cert-user-001"
            value={form.certificateId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                certificateId: event.target.value,
              }))
            }
            required
          />
        </label>
        <label>
          Reason
          <input
            name="reason"
            value={form.reason}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, reason: event.target.value }))
            }
          />
        </label>
        <div className="sys-inline-actions">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Applying" : "Revoke access"}
          </button>
          <button type="button" onClick={refreshSnapshot} disabled={busy}>
            Refresh CRL
          </button>
        </div>
        {message && (
          <small
            style={{
              color: message.type === "success" ? "#7bffc6" : "#ff9f92",
            }}
          >
            {message.text}
          </small>
        )}
      </form>
      <div className="sys-crl-list">
        {revokedEntries.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.6)" }}>
            No revoked certificates recorded.
          </p>
        )}
        {revokedEntries.map((certId) => (
          <div key={certId} className="sys-crl-row">
            <div>
              <strong>{certId}</strong>
              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                {metadata?.[certId]?.reason || "reason unavailable"}
              </p>
            </div>
            <small>{metadata?.[certId]?.revoked_at || "--"}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CRLPanel;
