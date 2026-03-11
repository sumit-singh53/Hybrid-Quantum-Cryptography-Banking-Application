import api from "./api";

export const fetchManagerDashboard = async () => {
    const response = await api.get("/manager/dashboard");
    return response.data;
};

export const fetchPendingTransactions = async () => {
    const response = await api.get("/manager/transactions/pending");
    return response.data;
};

export const decideOnTransaction = async (transactionId, payload) => {
    const response = await api.post(
        `/manager/transactions/${transactionId}/decision`,
        payload
    );
    return response.data;
};

export const fetchManagedCustomers = async () => {
    const response = await api.get("/manager/customers");
    return response.data;
};

export const resetCustomerDeviceBinding = async (userId) => {
    const response = await api.post("/manager/customers/reset-device", {
        user_id: userId,
    });
    return response.data;
};

export const revokeCertificate = async (certificateId, reason) => {
    const response = await api.post("/manager/certificates/revoke", {
        certificate_id: certificateId,
        reason,
    });
    return response.data;
};

export const fetchManagerReports = async () => {
    const response = await api.get("/manager/reports");
    return response.data;
};

export const fetchBranchAudit = async () => {
    const response = await api.get("/manager/branch-audit");
    return response.data;
};

export const fetchEscalations = async () => {
    const response = await api.get("/manager/escalations");
    return response.data;
};

export const submitEscalation = async (payload) => {
    const response = await api.post("/manager/escalations", payload);
    return response.data;
};

export const fetchCustomerAccounts = async (statusFilter = null, accountTypeFilter = null) => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (accountTypeFilter) params.account_type = accountTypeFilter;
    
    const response = await api.get("/manager/accounts", { params });
    return response.data;
};

export const getCustomerAccountDetails = async (customerId) => {
    const response = await api.get(`/manager/accounts/${customerId}`);
    return response.data;
};

export const updateAccountStatus = async (customerId, status, reason = null) => {
    const response = await api.put(`/manager/accounts/${customerId}/status`, {
        status,
        reason,
    });
    return response.data;
};

export const forwardAccountForReview = async (customerId, reason, priority = "normal") => {
    const response = await api.post(`/manager/accounts/${customerId}/forward`, {
        reason,
        priority,
    });
    return response.data;
};

export const getAccountStatistics = async () => {
    const response = await api.get("/manager/accounts/statistics");
    return response.data;
};

// KYC Verification Services
export const fetchPendingKYC = async () => {
    const response = await api.get("/manager/kyc/pending");
    return response.data;
};

export const fetchAllKYC = async (statusFilter = null) => {
    const url = statusFilter 
        ? `/manager/kyc/all?status=${statusFilter}` 
        : "/manager/kyc/all";
    const response = await api.get(url);
    return response.data;
};

export const fetchKYCDetails = async (customerId) => {
    const response = await api.get(`/manager/kyc/${customerId}`);
    return response.data;
};

export const verifyKYC = async (customerId, remarks = null) => {
    const response = await api.post(`/manager/kyc/${customerId}/verify`, {
        remarks,
    });
    return response.data;
};

export const rejectKYC = async (customerId, reason) => {
    const response = await api.post(`/manager/kyc/${customerId}/reject`, {
        reason,
    });
    return response.data;
};

export const fetchKYCStatistics = async () => {
    const response = await api.get("/manager/kyc/statistics");
    return response.data;
};

// ========================================================================
// APPROVAL HISTORY SERVICES (READ-ONLY)
// ========================================================================

export const fetchApprovalHistory = async (filters = {}) => {
    const params = {};
    if (filters.decision) params.decision = filters.decision;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.min_amount) params.min_amount = filters.min_amount;
    if (filters.max_amount) params.max_amount = filters.max_amount;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await api.get("/manager/approvals/history", { params });
    return response.data;
};

export const fetchApprovalDetail = async (transactionId) => {
    const response = await api.get(`/manager/approvals/history/${transactionId}`);
    return response.data;
};

export const fetchApprovalStatistics = async () => {
    const response = await api.get("/manager/approvals/statistics");
    return response.data;
};

// ========================================================================
// TRANSACTION RISK ASSESSMENT SERVICES (READ-ONLY)
// ========================================================================

export const fetchRiskAssessment = async (filters = {}) => {
    const params = {};
    if (filters.risk_level) params.risk_level = filters.risk_level;
    if (filters.min_amount) params.min_amount = filters.min_amount;
    if (filters.max_amount) params.max_amount = filters.max_amount;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await api.get("/manager/risk-assessment", { params });
    return response.data;
};

export const fetchRiskDetail = async (transactionId) => {
    const response = await api.get(`/manager/risk-assessment/${transactionId}`);
    return response.data;
};

export const fetchRiskSummary = async () => {
    const response = await api.get("/manager/risk-assessment/summary");
    return response.data;
};

// ========================================================================
// MANAGER AUDIT LOGS SERVICES (READ-ONLY)
// ========================================================================

export const fetchManagerAuditLogs = async (filters = {}) => {
    const params = {};
    if (filters.action_type) params.action_type = filters.action_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await api.get("/manager/audit-logs", { params });
    return response.data;
};

export const fetchAuditLogStatistics = async () => {
    const response = await api.get("/manager/audit-logs/statistics");
    return response.data;
};

// ========================================================================
// BRANCH AUDIT SERVICES (READ-ONLY)
// ========================================================================

export const fetchBranchAuditOverview = async () => {
    const response = await api.get("/manager/branch-audit/overview");
    return response.data;
};

export const fetchBranchActivityReport = async (branchCode) => {
    const response = await api.get(`/manager/branch-audit/${branchCode}`);
    return response.data;
};

// ========================================================================
// SECURITY ALERTS SERVICES (READ-ONLY)
// ========================================================================

export const fetchSecurityAlerts = async (filters = {}) => {
    const params = {};
    if (filters.severity) params.severity = filters.severity;
    if (filters.alert_type) params.alert_type = filters.alert_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await api.get("/manager/security-alerts", { params });
    return response.data;
};

export const fetchSecurityAlertDetail = async (alertId) => {
    const response = await api.get(`/manager/security-alerts/${alertId}`);
    return response.data;
};

export const fetchSecurityAlertStatistics = async () => {
    const response = await api.get("/manager/security-alerts/statistics");
    return response.data;
};

// ========================================================================
// ENCRYPTION STATUS SERVICES (READ-ONLY)
// ========================================================================

export const fetchEncryptionStatus = async () => {
    const response = await api.get("/manager/encryption/status");
    return response.data;
};

// ========================================================================
// CERTIFICATE OVERVIEW SERVICES (READ-ONLY)
// ========================================================================

export const fetchCertificateOverview = async (filters = {}) => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.role) params.role = filters.role;
    if (filters.limit) params.limit = filters.limit;
    
    const response = await api.get("/manager/certificates/overview", { params });
    return response.data;
};

export const fetchCertificateDetail = async (certificateId) => {
    const response = await api.get(`/manager/certificates/overview/${certificateId}`);
    return response.data;
};

export const fetchCertificateRequestSummary = async () => {
    const response = await api.get("/manager/certificates/requests/summary");
    return response.data;
};

export const fetchCertificateStatistics = async () => {
    const response = await api.get("/manager/certificates/statistics");
    return response.data;
};
