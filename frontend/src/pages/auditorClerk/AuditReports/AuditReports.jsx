import React, { useState } from "react";
import { exportAuditReport } from "../../../services/auditorClerkService";
import "./AuditReports.css";

const AuditReports = () => {
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async (format) => {
    setError(null);
    setDownloading(format);
    try {
      const { data, filename, mimeType, binary } =
        await exportAuditReport(format);
      if (binary) {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to export report");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      <div>
        <h2 className="text-3xl font-semibold text-slate-50">Reports</h2>
        <p className="mt-2 text-base text-slate-400">
          Export immutable audit evidence for regulators.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {[
          { format: "csv", label: "Export CSV" },
          { format: "pdf", label: "Export PDF" },
          { format: "json", label: "Download JSON" },
        ].map((option) => (
          <button
            key={option.format}
            onClick={() => handleDownload(option.format)}
            disabled={downloading === option.format}
            className="min-w-[160px] rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading === option.format ? "Preparing..." : option.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-medium text-rose-400">{error}</p>}
    </div>
  );
};

export default AuditReports;
