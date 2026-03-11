import api from "./api";

/**
 * Create new transaction
 */
export const createTransaction = async (payload) => {
    const response = await api.post("/transactions/create", payload);
    return response.data;
};

/**
 * Approve or reject transaction
 */
export const approveTransaction = async (transactionId, action) => {
    const response = await api.post(`/transactions/approve/${transactionId}`, {
        action,
    });
    return response.data;
};

/**
 * Fetch transaction history
 */
export const getTransactionHistory = async () => {
    const response = await api.get("/transactions/my");
    return response.data;
};

/**
 * Fetch single transaction details
 */
export const getTransactionDetails = async (transactionId) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data;
};

export const getAllTransactions = async () => {
    const response = await api.get("/transactions/all");
    return response.data;
};
