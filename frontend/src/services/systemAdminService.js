import api from "./api";

const endpoint = "/system-admin";

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
};

export default systemAdminService;
