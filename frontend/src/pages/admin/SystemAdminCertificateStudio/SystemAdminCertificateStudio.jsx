import React from "react";
import CertificateIssuer from "../CertificateIssuer";
import "./SystemAdminCertificateStudio.css";

const SystemAdminCertificateStudio = () => {
  return (
    <section className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif] text-slate-100">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950 via-slate-900/80 to-indigo-950 p-6 shadow-2xl">
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          Certificate studio
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Issue operator certificates
        </h1>
      </div>

      <CertificateIssuer sectionId="sys-admin-cert-studio" />
    </section>
  );
};

export default SystemAdminCertificateStudio;
