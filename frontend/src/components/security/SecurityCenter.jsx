import React, { useEffect, useState } from "react";
import {
  fetchCustomerOverview,
  fetchCustomerAuditTrail,
} from "../../services/customerService";

const bannerStyle = (warning = false) => ({
  padding: "16px",
  borderRadius: "12px",
  background: warning ? "#fff7ed" : "#ecfdf5",
  border: warning ? "1px solid #fdba74" : "1px solid #86efac",
  color: warning ? "#9a3412" : "#166534",
  marginTop: "16px",
});

const SecurityCenter = () => {
  const [overview, setOverview] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        const [ov, audit] = await Promise.all([
          fetchCustomerOverview(),
          fetchCustomerAuditTrail(),
        ]);
        setOverview(ov);
        setAuditTrail(audit || []);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load security data",
        );
      }
    };

    loadSecurityData();
  }, []);

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  if (!overview) {
    return <p>Evaluating security posture…</p>;
  }

  const deviceState = overview.device_state || {};
  const requiresReverify = deviceState.requires_reverify;

  const formatLocation = (login) => {
    if (!login) {
      return "--";
    }
    const { city, country, ip } = login;
    if (city && country) {
      return `${city}, ${country}`;
    }
    if (city || country) {
      return city || country;
    }
    if (ip) {
      return `Derived from IP ${ip}`;
    }
    return "Location unavailable";
  };

  return (
    <div>
      <h2>Security Center</h2>
      <p>
        Review certificate posture, device bindings, and immutable audit logs.
      </p>

      <section style={{ marginTop: "24px" }}>
        <h3>Certificate Health</h3>
        <div style={bannerStyle(overview.certificate?.status !== "Valid")}>
          <strong>Status:</strong> {overview.certificate?.status || "Unknown"}
          <br />
          <strong>Valid Until:</strong> {overview.certificate?.valid_to || "--"}
          <br />
          <strong>Lineage:</strong> {overview.certificate?.lineage_id || "--"}
        </div>
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3>Device Binding</h3>
        <div style={bannerStyle(requiresReverify)}>
          <p style={{ margin: 0 }}>
            <strong>Enrolled Device ID:</strong>{" "}
            {deviceState.enrolled_device_id || "--"}
            <br />
            <strong>Session Device ID:</strong>{" "}
            {deviceState.session_device_id || "--"}
            <br />
            {requiresReverify ? (
              <span>
                Device binding mismatch detected. Please re-run the certificate
                login flow on the correct device to re-issue trust.
              </span>
            ) : (
              <span>Device binding validated for this session.</span>
            )}
          </p>
        </div>
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3>Last Login</h3>
        <ul>
          <li>Timestamp: {overview.last_login?.timestamp || "--"}</li>
          <li>Origin IP: {overview.last_login?.ip || "--"}</li>
          <li>Location: {formatLocation(overview.last_login)}</li>
        </ul>
      </section>

      <section style={{ marginTop: "32px" }}>
        <h3>Immutable Audit Trail</h3>
        {auditTrail.length === 0 ? (
          <p>No request activity recorded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}
              >
                <th>When</th>
                <th>Action</th>
                <th>Path</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {auditTrail
                .slice()
                .reverse()
                .map((entry) => (
                  <tr
                    key={entry.entry_hash}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td>{entry.timestamp}</td>
                    <td>{entry.action_name}</td>
                    <td>{entry.path}</td>
                    <td>{entry.device_id || "--"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SecurityCenter;
