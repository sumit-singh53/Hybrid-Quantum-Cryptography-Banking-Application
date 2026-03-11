import React, { useEffect, useState } from "react";
import { fetchExportHistory, generateExportReport } from "../../../services/auditorClerkService";
import "./ExportReports.css";

const ExportReports = () => {
  const [exportHistory, setExportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [reportType, setReportType] = useState("transaction_audit");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [dateRange, setDateRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadExportHistory();
  }, []);

  const loadExportHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchExportHistory();
      setExportHistory(data.history || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load export history");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const reportConfig = {
        report_type: reportType,
        export_format: exportFormat,
        date_range: dateRange,
        status: statusFilter,
      };

      const result = await generateExportReport(reportConfig);

      // Download the file
      if (result.binary) {
        const blob = new Blob([result.data], { type: result.mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setSuccess(`Report generated successfully: ${result.filename}`);
      
      // Reload history
      setTimeout(() => {
        loadExportHistory();
      }, 1000);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const getReportTypeLabel = (type) => {
    const labels = {
      transaction_audit: "Transaction Audit Report",
      user_activity: "User Activity Report",
      security_encryption: "Security & Encryption Events Report",
      data_integrity: "Data Integrity Verification Summary",
    };
    return labels[type] || type;
  };

  return (
    <div className="export-reports-container">
      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          <p>{success}</p>
        </div>
      )}

      {/* Report Generation Form */}
      <section className="export-form-section">
        <div className="section-header">
          <h3 className="section-title">Generate New Report</h3>
          <p className="section-description">
            Select report type, format, and filters to generate a compliance report
          </p>
        </div>

        <form onSubmit={handleGenerateReport} className="export-form">
          <div className="form-grid">
            {/* Report Type */}
            <div className="form-group">
              <label htmlFor="reportType" className="form-label">
                Report Type <span className="required">*</span>
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="form-select"
                required
              >
                <option value="transaction_audit">Transaction Audit Report</option>
                <option value="user_activity">User Activity Report</option>
                <option value="security_encryption">Security & Encryption Events Report</option>
                <option value="data_integrity">Data Integrity Verification Summary</option>
              </select>
              <p className="form-hint">Select the type of report to generate</p>
            </div>

            {/* Export Format */}
            <div className="form-group">
              <label htmlFor="exportFormat" className="form-label">
                Export Format <span className="required">*</span>
              </label>
              <select
                id="exportFormat"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="form-select"
                required
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
              <p className="form-hint">Choose the output format</p>
            </div>

            {/* Date Range */}
            <div className="form-group">
              <label htmlFor="dateRange" className="form-label">
                Date Range <span className="required">*</span>
              </label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="form-select"
                required
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="365d">Last Year</option>
              </select>
              <p className="form-hint">Time period for the report</p>
            </div>

            {/* Status Filter (conditional) */}
            {reportType === "transaction_audit" && (
              <div className="form-group">
                <label htmlFor="statusFilter" className="form-label">
                  Transaction Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <p className="form-hint">Filter by transaction status</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  Generating Report...
                </>
              ) : (
                <>
                  <span className="btn-icon">📥</span>
                  Generate & Download Report
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Export History */}
      <section className="export-history-section">
        <div className="section-header">
          <h3 className="section-title">Export History</h3>
          <p className="section-description">
            Recent report exports for audit trail
          </p>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading export history...</p>
          </div>
        ) : exportHistory.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p className="empty-text">No export history available</p>
            <p className="empty-hint">Generate your first report to see it here</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Report Type</th>
                  <th>Format</th>
                  <th>Generated At</th>
                  <th>Generated By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="report-type-cell">
                      <span className="report-type-badge">
                        {getReportTypeLabel(item.report_type)}
                      </span>
                    </td>
                    <td>
                      <span className="format-badge">{item.export_format}</span>
                    </td>
                    <td className="timestamp-cell">
                      {new Date(item.generated_at).toLocaleString()}
                    </td>
                    <td className="user-cell">{item.generated_by}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Security Notice */}
      <section className="security-notice">
        <div className="notice-icon">🔒</div>
        <div className="notice-content">
          <h4 className="notice-title">Security & Compliance Notice</h4>
          <ul className="notice-list">
            <li>All report exports are logged and audited</li>
            <li>Sensitive data (account numbers, keys) are automatically masked</li>
            <li>Reports contain read-only data from immutable audit logs</li>
            <li>Export actions are recorded with your auditor identity</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default ExportReports;
