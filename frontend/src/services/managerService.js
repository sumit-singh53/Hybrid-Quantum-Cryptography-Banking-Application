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
