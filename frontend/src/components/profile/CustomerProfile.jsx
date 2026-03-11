import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCustomerOverview,
  fetchCustomerCertificate,
} from "../../services/customerService";

const textBoxStyle = {
  width: "100%",
  minHeight: "140px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  padding: "12px",
  fontFamily: "monospace",
};

const CustomerProfile = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [certificateText, setCertificateText] = useState("");
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchCustomerOverview();
        setOverview(data);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Unable to load profile overview"
        );
      }
    };

    loadProfile();
  }, []);

  const handleDownloadCertificate = async () => {
    setError(null);
    setDownloading(true);
    try {
      const data = await fetchCustomerCertificate();
      setCertificateText(data.certificate_pem || "");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to fetch certificate contents"
      );
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <div>
      <h2>Profile</h2>
      <p>Identity derived from your PQ-hardened certificate.</p>

      <section style={{ marginTop: "24px" }}>
        <h3>Personal Details</h3>
        <ul>
          <li>Name: {user?.name}</li>
          <li>User ID: {user?.id}</li>
          <li>Role: {user?.role}</li>
          <li>
            Allowed actions: {overview?.certificate?.allowed_actions || "--"}
          </li>
        </ul>
      </section>

      <section style={{ marginTop: "24px" }}>
        <h3>Certificate</h3>
        <p>Status: {overview?.certificate?.status || "Unknown"}</p>
        <p>Lineage: {overview?.certificate?.lineage_id || "--"}</p>
        <p>CRL URL: {overview?.certificate?.crl_url || "--"}</p>
        <button onClick={handleDownloadCertificate} disabled={downloading}>
          {downloading ? "Downloading..." : "Download Public Certificate"}
        </button>
        {certificateText && (
          <textarea
            readOnly
            style={{ ...textBoxStyle, marginTop: "16px" }}
            value={certificateText}
          />
        )}
      </section>
    </div>
  );
};

export default CustomerProfile;
