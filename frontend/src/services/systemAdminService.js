import api from "./api";

const endpoint = "/admin";

const getOverview = async () => {
    const response = await api.get(`${endpoint}/dashboard`);
    return response.data;
};

const getCertificateSummary = async () => {
    const response = await api.get(`${endpoint}/certificates/summary`);
    return response.data;
};

const listIssuedCertificates = async () => {
    const response = await api.get(`${endpoint}/certificates/list`);
    return response.data;
};

const issueCertificate = async (payload) => {
    const response = await api.post(`${endpoint}/certificates/issue`, payload);
    return response.data;
};

const getCRL = async () => {
    const response = await api.get(`${endpoint}/crl`);
    return response.data;
};

const revokeCertificate = async (payload) => {
    const response = await api.post(`${endpoint}/crl/revoke`, payload);
    return response.data;
};

const rotateAuthorityKeys = async () => {
    const response = await api.post(`${endpoint}/ca/rotate`);
    return response.data;
};

const killSessions = async (payload) => {
    const response = await api.post(`${endpoint}/sessions/kill`, payload);
    return response.data;
};

const getSecurityEvents = async (params = {}) => {
    const response = await api.get(`${endpoint}/security/events`, { params });
    return response.data;
};

const getGlobalAuditFeed = async (params = {}) => {
    const response = await api.get(`${endpoint}/audit/global`, { params });
    return response.data;
};

const listRoles = async () => {
    const response = await api.get(`${endpoint}/roles`);
    return response.data;
};

const createRole = async (payload) => {
    const response = await api.post(`${endpoint}/roles`, payload);
    return response.data;
};

const updateRole = async (roleId, payload) => {
    const response = await api.put(`${endpoint}/roles/${roleId}`, payload);
    return response.data;
};

const deleteRole = async (roleId) => {
    const response = await api.delete(`${endpoint}/roles/${roleId}`);
    return response.data;
};

const listUsers = async (params = {}) => {
    const response = await api.get(`${endpoint}/users`, { params });
    return response.data;
};

const createUser = async (payload) => {
    const response = await api.post(`${endpoint}/users`, payload);
    return response.data;
};

const updateUser = async (userId, payload) => {
    const response = await api.put(`${endpoint}/users/${userId}`, payload);
    return response.data;
};

const deleteUser = async (userId) => {
    const response = await api.delete(`${endpoint}/users/${userId}`);
    return response.data;
};

const getCryptoStatus = async () => {
    const response = await api.get(`${endpoint}/crypto/status`);
    return response.data;
};

const getCryptoHealth = async () => {
    const response = await api.get(`${endpoint}/crypto/health`);
    return response.data;
};

const getCryptoAlgorithms = async () => {
    const response = await api.get(`${endpoint}/crypto/algorithms`);
    return response.data;
};

const getSecurityPolicies = async () => {
    const response = await api.get(`${endpoint}/security-policies`);
    return response.data;
};

const getSecurityPolicySummary = async () => {
    const response = await api.get(`${endpoint}/security-policies/summary`);
    return response.data;
};

const updateSecurityPolicy = async (policyKey, policyValue) => {
    const response = await api.put(`${endpoint}/security-policies/${policyKey}`, {
        policy_value: policyValue,
    });
    return response.data;
};

const bulkUpdateSecurityPolicies = async (updates) => {
    const response = await api.post(`${endpoint}/security-policies/bulk-update`, {
        updates,
    });
    return response.data;
};

const initializeSecurityPolicies = async () => {
    const response = await api.post(`${endpoint}/security-policies/initialize`);
    return response.data;
};

// System Monitoring
const getSystemHealth = async () => {
    const response = await api.get(`${endpoint}/monitoring/health`);
    return response.data;
};

const getSecurityMetrics = async () => {
    const response = await api.get(`${endpoint}/monitoring/security`);
    return response.data;
};

const getPerformanceMetrics = async () => {
    const response = await api.get(`${endpoint}/monitoring/performance`);
    return response.data;
};

const getSystemAlerts = async () => {
    const response = await api.get(`${endpoint}/monitoring/alerts`);
    return response.data;
};

const getMonitoringOverview = async () => {
    const response = await api.get(`${endpoint}/monitoring/overview`);
    return response.data;
};

// Incident Response
const getIncidents = async (params = {}) => {
    const response = await api.get(`${endpoint}/incidents`, { params });
    return response.data;
};

const getIncidentStatistics = async () => {
    const response = await api.get(`${endpoint}/incidents/statistics`);
    return response.data;
};

const getIncidentById = async (incidentId) => {
    const response = await api.get(`${endpoint}/incidents/${incidentId}`);
    return response.data;
};

const createIncident = async (incidentData) => {
    const response = await api.post(`${endpoint}/incidents`, incidentData);
    return response.data;
};

const updateIncidentStatus = async (incidentId, status, notes) => {
    const response = await api.put(`${endpoint}/incidents/${incidentId}/status`, {
        status,
        notes,
    });
    return response.data;
};

const lockAccountIncident = async (incidentId, userId, reason) => {
    const response = await api.post(`${endpoint}/incidents/${incidentId}/lock-account`, {
        user_id: userId,
        reason,
    });
    return response.data;
};

const unlockAccountIncident = async (incidentId, userId, reason) => {
    const response = await api.post(`${endpoint}/incidents/${incidentId}/unlock-account`, {
        user_id: userId,
        reason,
    });
    return response.data;
};

const detectIncidents = async () => {
    const response = await api.post(`${endpoint}/incidents/detect`);
    return response.data;
};

// System Configuration
const getSystemConfig = async () => {
    const response = await api.get(`${endpoint}/system-config`);
    return response.data;
};

const getSystemConfigSummary = async () => {
    const response = await api.get(`${endpoint}/system-config/summary`);
    return response.data;
};

const getSystemConfigByCategory = async (category) => {
    const response = await api.get(`${endpoint}/system-config/category/${category}`);
    return response.data;
};

const updateSystemConfig = async (configKey, configValue) => {
    const response = await api.put(`${endpoint}/system-config/${configKey}`, {
        config_value: configValue,
    });
    return response.data;
};

const bulkUpdateSystemConfig = async (updates) => {
    const response = await api.post(`${endpoint}/system-config/bulk-update`, {
        updates,
    });
    return response.data;
};

const initializeSystemConfig = async () => {
    const response = await api.post(`${endpoint}/system-config/initialize`);
    return response.data;
};

// Backup & Recovery
const getBackups = async () => {
    const response = await api.get(`${endpoint}/backups`);
    return response.data;
};

const getBackupStatistics = async () => {
    const response = await api.get(`${endpoint}/backups/statistics`);
    return response.data;
};

const getBackupById = async (backupId) => {
    const response = await api.get(`${endpoint}/backups/${backupId}`);
    return response.data;
};

const createBackup = async (backupData) => {
    const response = await api.post(`${endpoint}/backups/create`, backupData);
    return response.data;
};

const verifyBackup = async (backupId) => {
    const response = await api.post(`${endpoint}/backups/${backupId}/verify`);
    return response.data;
};

const restoreBackup = async (backupId, data) => {
    const response = await api.post(`${endpoint}/backups/${backupId}/restore`, data);
    return response.data;
};

const deleteBackup = async (backupId) => {
    const response = await api.delete(`${endpoint}/backups/${backupId}`);
    return response.data;
};

// Certificate Request Management
const getCertificateRequests = async (params = {}) => {
    const response = await api.get(`${endpoint}/certificate-requests`, { params });
    return response.data;
};

const getCertificateRequestById = async (requestId) => {
    const response = await api.get(`${endpoint}/certificate-requests/${requestId}`);
    return response.data;
};

const approveCertificateRequest = async (requestId, data) => {
    const response = await api.post(`${endpoint}/certificate-requests/${requestId}/approve`, data);
    return response.data;
};

const rejectCertificateRequest = async (requestId, data) => {
    const response = await api.post(`${endpoint}/certificate-requests/${requestId}/reject`, data);
    return response.data;
};

const getCertificateRequestStatistics = async () => {
    const response = await api.get(`${endpoint}/certificate-requests/statistics`);
    return response.data;
};

const getIssuedCertificates = async (params = {}) => {
    const response = await api.get(`${endpoint}/certificate-requests/issued-certificates`, { params });
    return response.data;
};

const systemAdminService = {
    getOverview,
    getCertificateSummary,
    listIssuedCertificates,
    issueCertificate,
    getCRL,
    revokeCertificate,
    rotateAuthorityKeys,
    killSessions,
    getSecurityEvents,
    getGlobalAuditFeed,
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    getCryptoStatus,
    getCryptoHealth,
    getCryptoAlgorithms,
    getSecurityPolicies,
    getSecurityPolicySummary,
    updateSecurityPolicy,
    bulkUpdateSecurityPolicies,
    initializeSecurityPolicies,
    getSystemHealth,
    getSecurityMetrics,
    getPerformanceMetrics,
    getSystemAlerts,
    getMonitoringOverview,
    getIncidents,
    getIncidentStatistics,
    getIncidentById,
    createIncident,
    updateIncidentStatus,
    lockAccountIncident,
    unlockAccountIncident,
    detectIncidents,
    getSystemConfig,
    getSystemConfigSummary,
    getSystemConfigByCategory,
    updateSystemConfig,
    bulkUpdateSystemConfig,
    initializeSystemConfig,
    getBackups,
    getBackupStatistics,
    getBackupById,
    createBackup,
    verifyBackup,
    restoreBackup,
    deleteBackup,
    getCertificateRequests,
    getCertificateRequestById,
    approveCertificateRequest,
    rejectCertificateRequest,
    getCertificateRequestStatistics,
    getIssuedCertificates,
};

export default systemAdminService;
