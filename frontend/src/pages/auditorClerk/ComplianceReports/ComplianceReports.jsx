import React, { useEffect, useState } from "react";
import { fetchComplianceReports, exportComplianceReport } from "../../../services/auditorClerkService";
import "./ComplianceReports.css";

const ComplianceReports = () => {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    loadComplianceReports();
  }, []);

  const loadComplianceReports = async () => {
    try {
      const data = await fetchComplianceReports();
      setReports(data.reports || []);
      setSummary(data.summary || {});
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load compliance reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType, format) => {
    setExporting(`${reportType}-${format}`);
    try {
      const { data, filename, mimeType, binary } = await exportComplianceReport(reportType, format);
      
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
      setError(err?.response?.data?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-lg text-slate-600">Loading compliance reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}

      {/* Compliance Summary */}
      {summary && (
        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Compliance Score
            </p>
            <h3 className="mt-4 text-5xl font-bold text-emerald-600">
              {summary.compliance_score || 0}%
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Overall system compliance
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Policy Violations
            </p>
            <h3 className="mt-4 text-5xl font-bold text-rose-600">
              {summary.policy_violations || 0}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Last 30 days
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit Findings
            </p>
            <h3 className="mt-4 text-5xl font-bold text-amber-600">
              {summary.audit_findings || 0}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Requiring attention
            </p>
          </article>
        </section>
      )}

      {/* Available Reports */}
      <section className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-900">
          Available Compliance Reports
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              type: "transaction_compliance",
              title: "Transaction Compliance Report",
              description: "All transaction activities with compliance status",
              icon: "📊",
            },
            {
              type: "user_access_audit",
              title: "User Access Audit Report",
              description: "User authentication and authorization events",
              icon: "👥",
            },
            {
              type: "certificate_lifecycle",
              title: "Certificate Lifecycle Report",
              description: "Certificate issuance, renewal, and revocation logs",
              icon: "🔐",
            },
            {
              type: "security_incidents",
              title: "Security Incidents Report",
              description: "All security events and incident responses",
              icon: "🛡️",
            },
            {
              type: "data_integrity",
              title: "Data Integrity Report",
              description: "Hash verification and data integrity checks",
              icon: "✓",
            },
            {
              type: "regulatory_summary",
              title: "Regulatory Summary Report",
              description: "Comprehensive regulatory compliance summary",
              icon: "📋",
            },
          ].map((report) => (
            <div
              key={report.type}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900">
                    {report.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-600">
                    {report.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["pdf", "csv", "json"].map((format) => (
                      <button
                        key={format}
                        onClick={() => handleExport(report.type, format)}
                        disabled={exporting === `${report.type}-${format}`}
                        className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {exporting === `${report.type}-${format}`
                          ? "Exporting..."
                          : `Export ${format.toUpperCase()}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Compliance Events */}
      {reports.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-2xl font-bold text-slate-900">
            Recent Compliance Events
          </h3>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Report Type
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Findings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {reports.slice(0, 10).map((report, index) => (
                    <tr
                      key={index}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(report.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {report.type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            report.status === "compliant"
                              ? "bg-emerald-100 text-emerald-700"
                              : report.status === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {report.findings || "No issues"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ComplianceReports;
