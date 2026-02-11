import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createTransaction } from "../../../services/transactionService";
import { fetchBeneficiaries, getBeneficiary } from "../../../services/beneficiaryService";
import { fetchCustomerOverview } from "../../../services/customerService";
import { validateAmount, isRequired } from "../../../utils/validators";
import TransactionConfirmModal from "../../../components/customer/TransactionConfirmModal";
import TransactionReceiptModal from "../../../components/customer/TransactionReceiptModal";
import "./CreateTransaction.css";

const PURPOSE_OPTIONS = [
  "Payment for Services",
  "Gift",
  "Family Support",
  "Loan Repayment",
  "Business Transaction",
  "Others"
];

const CreateTransaction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [customerAccount, setCustomerAccount] = useState(null);
  const [formData, setFormData] = useState({
    to_account: "",
    amount: "",
    purpose: "",
    customPurpose: "",
  });
  
  // Loading states
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // UI states
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadBeneficiaries();
    loadCustomerAccount();
  }, []);

  const loadCustomerAccount = async () => {
    try {
      setLoadingAccount(true);
      setError(null);
      
      const response = await fetchCustomerOverview();
      
      if (response) {
        const primaryAccount = response.accounts && response.accounts.length > 0 
          ? response.accounts[0] 
          : null;
        
        if (primaryAccount) {
          setCustomerAccount({
            full_name: user?.name || user?.username || "Customer",
            account_number: primaryAccount.account_number,
            balance: primaryAccount.balance || response.account_balance || 0,
          });
        } else if (user) {
          setCustomerAccount({
            full_name: user.name || user.username || "Customer",
            account_number: user.account_number || "N/A",
            balance: response.account_balance || user.balance || 0
          });
        }
      } else if (user) {
        setCustomerAccount({
          full_name: user.name || user.username || "Customer",
          account_number: user.account_number || "N/A",
          balance: user.balance || 0
        });
      }
    } catch (err) {
      console.error("Failed to load account:", err);
      if (user) {
        setCustomerAccount({
          full_name: user.name || user.username || "Customer",
          account_number: user.account_number || "N/A",
          balance: user.balance || 0
        });
      }
    } finally {
      setLoadingAccount(false);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      setLoadingBeneficiaries(true);
      const response = await fetchBeneficiaries(false);
      setBeneficiaries(response.beneficiaries || []);
    } catch (err) {
      console.error("Failed to load beneficiaries:", err);
    } finally {
      setLoadingBeneficiaries(false);
    }
  };

  const handleBeneficiarySelect = async (e) => {
    const beneficiaryId = e.target.value;
    
    if (!beneficiaryId) {
      setSelectedBeneficiary(null);
      setFormData({ ...formData, to_account: "" });
      return;
    }

    try {
      const fullBeneficiary = await getBeneficiary(beneficiaryId, true);
      setSelectedBeneficiary(fullBeneficiary);
      setFormData({ 
        ...formData, 
        to_account: fullBeneficiary.account_number 
      });
    } catch (err) {
      console.error("Failed to fetch beneficiary:", err);
      const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
      if (beneficiary) {
        setSelectedBeneficiary(beneficiary);
        setFormData({ 
          ...formData, 
          to_account: beneficiary.account_number 
        });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null);
    
    if (name === "purpose" && value !== "Others") {
      setFormData(prev => ({ ...prev, purpose: value, customPurpose: "" }));
    }
  };

  const handleQuickAmount = (amount) => {
    setFormData({ ...formData, amount: amount.toString() });
    setError(null);
  };

  const validateForm = () => {
    const toAccountError = isRequired(formData.to_account, "Receiver account");
    if (toAccountError) {
      setError(toAccountError);
      return false;
    }

    const amountError = validateAmount(formData.amount);
    if (amountError) {
      setError(amountError);
      return false;
    }

    if (!formData.purpose) {
      setError("Please select a purpose");
      return false;
    }
    
    if (formData.purpose === "Others" && !formData.customPurpose.trim()) {
      setError("Please specify the purpose");
      return false;
    }
    
    const finalPurpose = formData.purpose === "Others" ? formData.customPurpose : formData.purpose;
    if (finalPurpose.length > 240) {
      setError("Purpose must be 240 characters or fewer");
      return false;
    }

    // Check sufficient balance
    if (customerAccount && parseFloat(formData.amount) > customerAccount.balance) {
      setError("Insufficient balance");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmTransaction = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const finalPurpose = formData.purpose === "Others" 
        ? formData.customPurpose.trim() 
        : formData.purpose;
      
      const payload = {
        to_account: formData.to_account.trim(),
        amount: parseFloat(formData.amount),
        purpose: finalPurpose,
      };

      const response = await createTransaction(payload);
      
      setShowConfirmModal(false);
      await loadCustomerAccount();
      
      setCompletedTransaction(response);
      setShowReceiptModal(true);

      setFormData({
        to_account: "",
        amount: "",
        purpose: "",
        customPurpose: "",
      });
      setSelectedBeneficiary(null);
    } catch (err) {
      console.error("Transaction error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Transaction failed";
      setError(errorMessage);
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setCompletedTransaction(null);
  };

  const maskAccount = (accountNumber) => {
    if (!accountNumber) return "";
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return "****" + str.slice(-4);
  };

  const balanceAfter = customerAccount && formData.amount 
    ? customerAccount.balance - parseFloat(formData.amount || 0)
    : null;

  return (
    <div className="create-transaction-page">
      <div className="transaction-container">
        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <div className="transaction-layout">
          {/* Main Form */}
          <div className="form-section">
            <form onSubmit={handleSubmit}>
              {/* From Account */}
              <div className="form-card">
                <div className="card-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h3>From Account</h3>
                </div>
                {loadingAccount ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading account...</p>
                  </div>
                ) : customerAccount ? (
                  <div className="account-display">
                    <div className="account-info">
                      <p className="account-name">{customerAccount.full_name}</p>
                      <p className="account-number">{maskAccount(customerAccount.account_number)}</p>
                    </div>
                    <div className="balance-info-green">
                      <span className="balance-label-green">Available Balance</span>
                      <span className="balance-amount-green">₹{parseFloat(customerAccount.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : (
                  <p className="error-text">Unable to load account</p>
                )}
              </div>

              {/* To Account */}
              <div className="form-card">
                <div className="card-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3>To Account</h3>
                </div>

                {loadingBeneficiaries ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading beneficiaries...</p>
                  </div>
                ) : beneficiaries.length === 0 ? (
                  <div className="empty-state">
                    <p>No beneficiaries found</p>
                    <button
                      type="button"
                      onClick={() => navigate("/customer/beneficiaries")}
                      className="btn-link"
                    >
                      Add Beneficiary
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Select Beneficiary *</label>
                      <select
                        value={selectedBeneficiary?.id || ""}
                        onChange={handleBeneficiarySelect}
                        className="form-select"
                      >
                        <option value="">-- Choose beneficiary --</option>
                        {beneficiaries.map((ben) => (
                          <option key={ben.id} value={ben.id}>
                            {ben.nickname || ben.beneficiary_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedBeneficiary && (
                      <div className="beneficiary-card">
                        <div className="beneficiary-info">
                          <p className="beneficiary-name">{selectedBeneficiary.beneficiary_name}</p>
                          <p className="beneficiary-details">
                            {selectedBeneficiary.bank_name} • {maskAccount(selectedBeneficiary.account_number)}
                          </p>
                        </div>
                        <span className="verified-badge">✓ Verified</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Account Number *</label>
                      <input
                        type="text"
                        name="to_account"
                        value={formData.to_account}
                        onChange={handleChange}
                        readOnly={!!selectedBeneficiary}
                        className="form-input"
                        placeholder="Account number"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Amount */}
              <div className="form-card">
                <div className="card-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3>Amount</h3>
                </div>

                <div className="form-group">
                  <label>Enter Amount (INR) *</label>
                  <div className="amount-input-wrapper">
                    <span className="currency">₹</span>
                    <input
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      className="form-input amount-input"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {balanceAfter !== null && formData.amount && (
                    <div className={`balance-preview ${balanceAfter >= 0 ? 'positive' : 'negative'}`}>
                      <span>Balance after:</span>
                      <span>₹{balanceAfter.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>

                <div className="quick-amounts">
                  <p>Quick amounts:</p>
                  <div className="quick-grid">
                    {[500, 1000, 2000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAmount(amt)}
                        className={`quick-btn ${formData.amount === amt.toString() ? 'active' : ''}`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="form-card">
                <div className="card-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3>Purpose</h3>
                </div>

                <div className="form-group">
                  <label>Select Purpose *</label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">-- Choose purpose --</option>
                    {PURPOSE_OPTIONS.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {purpose}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.purpose === "Others" && (
                  <div className="form-group">
                    <label>Specify Purpose *</label>
                    <textarea
                      name="customPurpose"
                      value={formData.customPurpose}
                      onChange={handleChange}
                      maxLength={240}
                      rows={3}
                      className="form-textarea"
                      placeholder="Please describe the purpose..."
                      required
                    />
                    <div className="char-count">
                      {formData.customPurpose.length}/240 characters
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !customerAccount || beneficiaries.length === 0 || (balanceAfter !== null && balanceAfter < 0)}
                className="submit-btn"
              >
                {submitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Send Money
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="sidebar-section">
            <div className="info-card">
              <div className="info-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4>Secure Transaction</h4>
              <p>All transfers are protected with post-quantum cryptography and monitored in real-time.</p>
            </div>

            <div className="info-card">
              <h4>Important Notes</h4>
              <ul>
                <li>Verify beneficiary details before sending</li>
                <li>High-value transfers require manager approval</li>
                <li>Keep your transaction receipt safe</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showConfirmModal && (
        <TransactionConfirmModal
          transactionData={formData}
          beneficiaryInfo={selectedBeneficiary || { 
            beneficiary_name: "Unknown", 
            account_number: formData.to_account 
          }}
          onConfirm={handleConfirmTransaction}
          onCancel={handleCancelConfirm}
          loading={submitting}
        />
      )}

      {showReceiptModal && completedTransaction && (
        <TransactionReceiptModal
          transaction={completedTransaction}
          onClose={handleCloseReceipt}
        />
      )}
    </div>
  );
};

export default CreateTransaction;
