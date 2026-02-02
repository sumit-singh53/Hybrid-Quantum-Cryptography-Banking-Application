import api from "./api";

export const fetchAuditorDashboard = async () => {
    const response = await api.get("/auditor-clerk/dashboard");
    return response.data;
};

export const fetchTransactionSummary = async () => {
    const response = await api.get("/auditor-clerk/transactions/summary");
    return response.data;
};

export const verifyTransactionIntegrity = async (transactionId) => {
    const response = await api.get(
        `/auditor-clerk/transactions/${transactionId}/integrity`
    );
    return response.data;
};

export const fetchCombinedLogs = async () => {
    const response = await api.get("/auditor-clerk/logs");
    return response.data;
};

export const fetchCertificateInventory = async () => {
    const response = await api.get("/auditor-clerk/certificates");
    return response.data;
};

export const fetchImmutableAuditTrail = async () => {
    const response = await api.get("/auditor-clerk/audit-trail");
    return response.data;
};

export const fetchAuditorProfile = async () => {
    const response = await api.get("/auditor-clerk/profile");
    return response.data;
};

export const exportAuditReport = async (format = "csv") => {
    const normalized = format.toLowerCase();
    const isBinary = normalized !== "json";
    const response = await api.get("/auditor-clerk/reports/export", {
        params: { format: normalized },
        responseType: isBinary ? "blob" : "json",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = match ? match[1].trim().replace(/"/g, "") : `audit-report.${normalized}`;

    return {
        data: response.data,
        filename,
        mimeType: response.headers?.["content-type"] || (isBinary ? "application/octet-stream" : "application/json"),
        binary: isBinary,
    };
};
