import api from "./api";
import { getGeoHeaders } from "../utils/geolocation";

export const requestCertificateChallenge = async ({
    certificateId,
    deviceId,
}) => {
    const response = await api.post("/auth/certificate-challenge", {
        certificate_id: certificateId,
        device_id: deviceId,
    });

    return response.data;
};

export const requestQrChallenge = async ({ certificateId, certHash }) => {
    const response = await api.post("/auth/qr-challenge", {
        certificate_id: certificateId,
        cert_hash: certHash,
    });
    return response.data;
};

export const finalizeCertificateLogin = async ({
    challengeToken,
    deviceId,
    deviceProof,
    rsaSignature,
    pqSignature,
}) => {
    const geoHeaders = await getGeoHeaders();
    const payload = {
        challenge_token: challengeToken,
        device_id: deviceId,
        rsa_signature: rsaSignature,
        pq_signature: pqSignature,
        device_proof: deviceProof,
    };

    const response = await api.post(
        "/auth/certificate-login",
        payload,
        {
            headers: {
                ...geoHeaders,
            },
        }
    );

    return response.data;
};

export const finalizeQrLogin = async ({
    challengeToken,
    deviceId,
    rsaSignature,
    pqSignature,
    deviceProof,
}) => {
    const geoHeaders = await getGeoHeaders();
    const payload = {
        challenge_token: challengeToken,
        device_id: deviceId,
        rsa_signature: rsaSignature,
        device_proof: deviceProof,
    };

    if (typeof pqSignature === "string" && pqSignature.length > 0) {
        payload.pq_signature = pqSignature;
    }

    const response = await api.post(
        "/auth/qr-login",
        payload,
        {
            headers: {
                ...geoHeaders,
            },
        },
    );

    return response.data;
};

export const fetchServerSession = async () => {
    const response = await api.get("/auth/verify-session");
    return response.data;
};

/**
 * Logout (optional backend call)
 */
export const logoutUser = async () => {
    return api.post("/auth/logout");
};

