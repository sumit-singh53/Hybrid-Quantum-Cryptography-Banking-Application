import api from "./api";

export const fetchBeneficiaries = async (includeInactive = false) => {
    const response = await api.get(`/beneficiary/list?include_inactive=${includeInactive}`);
    return response.data;
};

export const getBeneficiary = async (beneficiaryId, unmask = false) => {
    const response = await api.get(`/beneficiary/${beneficiaryId}?unmask=${unmask}`);
    return response.data;
};

export const addBeneficiary = async (beneficiaryData) => {
    const response = await api.post("/beneficiary/add", beneficiaryData);
    return response.data;
};

export const updateBeneficiary = async (beneficiaryId, updateData) => {
    const response = await api.put(`/beneficiary/${beneficiaryId}`, updateData);
    return response.data;
};

export const deleteBeneficiary = async (beneficiaryId) => {
    const response = await api.delete(`/beneficiary/${beneficiaryId}`);
    return response.data;
};

export const toggleBeneficiaryStatus = async (beneficiaryId, status) => {
    const response = await api.patch(`/beneficiary/${beneficiaryId}/toggle-status`, { status });
    return response.data;
};

export const getBeneficiaryStatistics = async () => {
    const response = await api.get("/beneficiary/statistics");
    return response.data;
};
