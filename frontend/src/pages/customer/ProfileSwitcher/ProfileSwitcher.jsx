import React from "react";
import { Navigate } from "react-router-dom";
import "./ProfileSwitcher.css";
import { useRole } from "../../../context/RoleContext";
import { useAuth } from "../../../context/AuthContext";
import { ROLES } from "../../../utils/roleUtils";

const InfoRow = ({ label, value }) => (
  <div className="profile-meta-row">
    <span>{label}</span>
    <strong>{value || "Not available"}</strong>
  </div>
);

const CustomerProfile = ({ user }) => {
  const certificateId = user?.certificate_id || user?.certificateId;

  return (
    <section className="profile-shell">
      <header>
        <p className="profile-eyebrow">Customer Identity</p>
        <h1>Linked Hybrid Certificate</h1>
        <p className="profile-helper">
          This identity is enforced by the hybrid certificate issued to your
          device. Rotate secrets from Security Center if anything looks off.
        </p>
      </header>

      <div className="profile-grid">
        <article className="profile-card">
          <h3>Account Metadata</h3>
          <InfoRow label="Name" value={user?.name} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Certificate Id" value={certificateId} />
          <InfoRow label="Role" value={user?.role} />
        </article>

        <article className="profile-card">
          <h3>Security Checklist</h3>
          <ul>
            <li>Device binding enforced with PQ + RSA attestations.</li>
            <li>Transactions limited to certificate trust scope.</li>
            <li>
              Escalations flow through accountability log for anomaly review.
            </li>
          </ul>
          <div className="profile-actions">
            <a href="/security" className="profile-button">
              Manage Secrets
            </a>
            <a href="/accounts" className="profile-link">
              View Accounts
            </a>
          </div>
        </article>
      </div>
    </section>
  );
};

const AuditorProfile = ({ user }) => (
  <section className="profile-shell">
    <header>
      <p className="profile-eyebrow">Auditor Clerk Identity</p>
      <h1>Operational Clearance</h1>
      <p className="profile-helper">
        Sensitive audit tooling is scoped to your branch and certificate. Any
        deviations immediately ping the accountability store.
      </p>
    </header>

    <div className="profile-grid">
      <article className="profile-card">
        <h3>Operator Metadata</h3>
        <InfoRow label="Name" value={user?.name} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Role" value={user?.role} />
      </article>

      <article className="profile-card">
        <h3>Quick Actions</h3>
        <ul>
          <li>Review queued customer escalations.</li>
          <li>Regenerate CRL snapshot if a certificate is revoked.</li>
          <li>Push signed audit bundles to the manager workflow.</li>
        </ul>
        <div className="profile-actions">
          <a href="/audit/transactions" className="profile-button">
            Audit Transactions
          </a>
          <a href="/reports" className="profile-link">
            View Reports
          </a>
        </div>
      </article>
    </div>
  </section>
);

const ProfileSwitcher = () => {
  const { role } = useRole();
  const { user } = useAuth();

  if (role === ROLES.CUSTOMER) {
    return <CustomerProfile user={user} />;
  }

  if (role === ROLES.AUDITOR_CLERK) {
    return <AuditorProfile user={user} />;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default ProfileSwitcher;
