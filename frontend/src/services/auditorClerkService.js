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

export const fetchUserActivityLogs = async (filters = {}) => {
    const response = await api.get("/auditor-clerk/user-activity", {
        params: filters,
    });
    return response.data;
};

export const fetchSecurityEncryptionLogs = async (filters = {}) => {
    const response = await api.get("/auditor-clerk/security-logs", {
        params: filters,
    });
    return response.data;
};

export const verifyDataIntegrity = async (targetType, targetId) => {
    const response = await api.get("/auditor-clerk/verify-integrity", {
        params: { type: targetType, id: targetId },
    });
    return response.data;
};

export const fetchDataIntegrityVerification = async (filters = {}) => {
    const response = await api.get("/auditor-clerk/data-integrity", {
        params: filters,
    });
    return response.data;
};

export const fetchComplianceReports = async () => {
    const response = await api.get("/auditor-clerk/compliance-reports");
    return response.data;
};

export const exportComplianceReport = async (reportType, format = "pdf") => {
    const normalized = format.toLowerCase();
    const isBinary = normalized !== "json";
    const response = await api.get("/auditor-clerk/compliance-reports/export", {
        params: { type: reportType, format: normalized },
        responseType: isBinary ? "blob" : "json",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = match ? match[1].trim().replace(/"/g, "") : `compliance-${reportType}.${normalized}`;

    return {
        data: response.data,
        filename,
        mimeType: response.headers?.["content-type"] || (isBinary ? "application/octet-stream" : "application/json"),
        binary: isBinary,
    };
};

export const fetchSuspiciousActivityReports = async (filters = {}) => {
    const response = await api.get("/auditor-clerk/suspicious-activity", {
        params: filters,
    });
    return response.data;
};

export const exportSuspiciousActivityReport = async (format = "pdf", filters = {}) => {
    const normalized = format.toLowerCase();
    const isBinary = normalized !== "json";
    const response = await api.get("/auditor-clerk/suspicious-activity/export", {
        params: { ...filters, format: normalized },
        responseType: isBinary ? "blob" : "json",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = match ? match[1].trim().replace(/"/g, "") : `suspicious-activity.${normalized}`;

    return {
        data: response.data,
        filename,
        mimeType: response.headers?.["content-type"] || (isBinary ? "application/octet-stream" : "application/json"),
        binary: isBinary,
    };
};

export const fetchExportHistory = async () => {
    const response = await api.get("/auditor-clerk/export-reports/history");
    return response.data;
};

export const generateExportReport = async (reportConfig) => {
    const { report_type, export_format, ...filters } = reportConfig;
    const normalized = export_format.toLowerCase();
    const isBinary = normalized !== "json";
    
    const response = await api.post(
        "/auditor-clerk/export-reports/generate",
        {
            report_type,
            export_format: normalized,
            ...filters,
        },
        {
            responseType: isBinary ? "blob" : "json",
        }
    );

    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = match ? match[1].trim().replace(/"/g, "") : `report.${normalized}`;

    return {
        data: response.data,
        filename,
        mimeType: response.headers?.["content-type"] || (isBinary ? "application/octet-stream" : "application/json"),
        binary: isBinary,
    };
};
