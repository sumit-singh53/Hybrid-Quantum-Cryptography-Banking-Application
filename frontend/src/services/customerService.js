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
