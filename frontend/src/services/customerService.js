import api from "./api";

export const fetchCustomerOverview = async () => {
    const response = await api.get("/customer/overview");
    return response.data;
};

export const fetchCustomerAccounts = async () => {
    const response = await api.get("/customer/accounts");
    return response.data;
};

export const fetchCustomerTransactions = async () => {
    const response = await api.get("/customer/transactions");
    return response.data;
};

export const fetchCustomerAuditTrail = async () => {
    const response = await api.get("/customer/audit-trail");
    return response.data;
};

export const fetchCustomerCertificate = async () => {
    const response = await api.get("/customer/certificate");
    return response.data;
};

export const fetchCustomerAccountSummary = async () => {
    const response = await api.get("/customer/account-summary");
    return response.data;
};

export const fetchCustomerProfile = async () => {
    const response = await api.get("/customer/profile");
    return response.data;
};

export const updateCustomerProfile = async (profileData) => {
    const response = await api.put("/customer/profile", profileData);
    return response.data;
};

export const previewStatement = async (startDate, endDate) => {
    const response = await api.post("/customer/statement/preview", {
        start_date: startDate,
        end_date: endDate
    });
    return response.data;
};

export const downloadStatement = async (startDate, endDate, format = "pdf") => {
    const response = await api.post("/customer/statement/download", {
        start_date: startDate,
        end_date: endDate,
        format: format
    }, {
        responseType: 'blob'
    });
    return response;
};

export const createCertificateRequest = async (requestData) => {
    const response = await api.post("/customer/certificate-requests", requestData);
    return response.data;
};

export const getMyCertificateRequests = async () => {
    const response = await api.get("/customer/certificate-requests");
    return response.data;
};

export const getMyCertificateInfo = async () => {
    const response = await api.get("/customer/my-certificate");
    return response.data;
};


// ============================================================================
// SECURITY CENTER APIs
// ============================================================================

export const fetchSecurityDashboard = async () => {
    const response = await api.get("/customer/security/dashboard");
    return response.data;
};

export const fetchLastLogin = async () => {
    const response = await api.get("/customer/security/last-login");
    return response.data;
};

export const fetchActiveSessions = async () => {
    const response = await api.get("/customer/security/sessions");
    return response.data;
};

export const fetchSecurityStatus = async () => {
    const response = await api.get("/customer/security/status");
    return response.data;
};

export const fetchSecurityAlerts = async (limit = 20) => {
    const response = await api.get(`/customer/security/alerts?limit=${limit}`);
    return response.data;
};

export const logoutSession = async (sessionId) => {
    const response = await api.post("/customer/security/logout-session", {
        session_id: sessionId
    });
    return response.data;
};
