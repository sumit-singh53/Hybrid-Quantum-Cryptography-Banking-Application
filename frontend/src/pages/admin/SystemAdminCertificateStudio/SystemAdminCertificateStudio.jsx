import React from "react";
import CertificateIssuer from "../CertificateIssuer";
import "./SystemAdminCertificateStudio.css";

const SystemAdminCertificateStudio = () => {
  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <CertificateIssuer sectionId="sys-admin-cert-studio" />
    </section>
  );
};

export default SystemAdminCertificateStudio;
