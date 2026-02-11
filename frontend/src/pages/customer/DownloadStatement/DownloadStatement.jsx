import { useState } from 'react';
import { previewStatement, downloadStatement } from '../../../services/customerService';
import './DownloadStatement.css';

const DownloadStatement = () => {
  const [statementType, setStatementType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get current date and date 30 days ago
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleStatementTypeChange = (type) => {
    setStatementType(type);
    setError('');
    setPreview(null);
    setShowPreview(false);

    if (type === 'monthly') {
      // Set to last 30 days
      setStartDate(thirtyDaysAgo);
      setEndDate(today);
    } else {
      // Clear for custom
      setStartDate('');
      setEndDate('');
    }
  };

  const handlePreview = async () => {
    setError('');
    setPreview(null);

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const data = await previewStatement(startDate, endDate);
      setPreview(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setError('');

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const response = await downloadStatement(startDate, endDate, format);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement_${startDate}_${endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="download-statement-container">
      <div className="statement-form-card">
        <p className="statement-subtitle">Generate and download your account statement</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        {/* Statement Type Selection */}
        <div className="form-section">
          <label className="form-label">Statement Type</label>
          <div className="statement-type-buttons">
            <button
              className={`type-button ${statementType === 'monthly' ? 'active' : ''}`}
              onClick={() => handleStatementTypeChange('monthly')}
            >
              <span className="type-icon">📅</span>
              <span>Monthly (Last 30 Days)</span>
            </button>
            <button
              className={`type-button ${statementType === 'custom' ? 'active' : ''}`}
              onClick={() => handleStatementTypeChange('custom')}
            >
              <span className="type-icon">📆</span>
              <span>Custom Range</span>
            </button>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="form-section">
          <label className="form-label">Date Range</label>
          <div className="date-inputs">
            <div className="date-input-group">
              <label className="input-label">Start Date</label>
              <input
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={today}
                disabled={statementType === 'monthly'}
              />
            </div>
            <div className="date-separator">to</div>
            <div className="date-input-group">
              <label className="input-label">End Date</label>
              <input
                type="date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={today}
                disabled={statementType === 'monthly'}
              />
            </div>
          </div>
          <p className="date-hint">Maximum range: 1 year</p>
        </div>

        {/* Format Selection */}
        <div className="form-section">
          <label className="form-label">Download Format</label>
          <div className="format-buttons">
            <button
              className={`format-button ${format === 'pdf' ? 'active' : ''}`}
              onClick={() => setFormat('pdf')}
            >
              <span className="format-icon">📄</span>
              <span>PDF</span>
            </button>
            <button
              className={`format-button ${format === 'csv' ? 'active' : ''}`}
              onClick={() => setFormat('csv')}
            >
              <span className="format-icon">📊</span>
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="preview-button"
            onClick={handlePreview}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? 'Loading...' : 'Preview Statement'}
          </button>
          <button
            className="download-button"
            onClick={handleDownload}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? 'Downloading...' : 'Download Statement'}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && preview && (
        <div className="preview-card">
          <div className="preview-header">
            <h3>Statement Preview</h3>
            <button className="close-preview" onClick={() => setShowPreview(false)}>✕</button>
          </div>

          <div className="preview-content">
            {/* Account Summary */}
            <div className="preview-section">
              <h4>Account Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Account Holder:</span>
                  <span className="info-value">{preview.account_holder}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Number:</span>
                  <span className="info-value">{preview.account_number_masked}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Type:</span>
                  <span className="info-value">{preview.account_type || 'SAVINGS'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Status:</span>
                  <span className="info-value">{preview.account_status || 'ACTIVE'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Branch Code:</span>
                  <span className="info-value">{preview.branch_code || 'MUM-HQ'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Period:</span>
                  <span className="info-value">
                    {preview.statement_period.start_date} to {preview.statement_period.end_date}
                  </span>
                </div>
              </div>
            </div>

            {/* Balance Summary */}
            <div className="preview-section">
              <h4>Balance Summary</h4>
              <div className="balance-grid">
                <div className="balance-item opening">
                  <span className="balance-label">Opening Balance</span>
                  <span className="balance-value">
                    {preview.currency} {preview.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="balance-item closing">
                  <span className="balance-label">Closing Balance</span>
                  <span className="balance-value">
                    {preview.currency} {preview.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="preview-section">
              <h4>Transactions ({preview.transaction_count})</h4>
              {preview.transactions.length > 0 ? (
                <div className="transactions-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Purpose</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.transactions.slice(0, 10).map((tx, index) => (
                        <tr key={index}>
                          <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                          <td className="purpose-cell">{tx.purpose || 'N/A'}</td>
                          <td>
                            <span className={`direction-badge ${tx.direction.toLowerCase()}`}>
                              {tx.direction}
                            </span>
                          </td>
                          <td className={`amount ${tx.direction.toLowerCase()}`}>
                            {tx.direction === 'DEBIT' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={`status-badge ${tx.status.toLowerCase()}`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.transactions.length > 10 && (
                    <p className="more-transactions">
                      ... and {preview.transactions.length - 10} more transactions
                    </p>
                  )}
                </div>
              ) : (
                <p className="no-transactions">No transactions found in this period</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadStatement;
