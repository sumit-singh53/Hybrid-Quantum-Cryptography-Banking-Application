import api from "./api";

/**
 * Fetch certificate status
 */
export const getCertificateStatus = async () => {
    const response = await api.get("/certificates/status");
    return response.data;
};

/**
 * Fetch certificate details
 */
export const getCertificateDetails = async () => {
    const response = await api.get("/certificates/details");
    return response.data;
};
