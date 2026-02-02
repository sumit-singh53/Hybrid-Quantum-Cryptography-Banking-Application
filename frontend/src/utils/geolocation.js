let cachedGeoHeaders = null;

const GEO_ENDPOINT = "https://ipapi.co/json/";

const sanitizeHeaderValue = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    const stringValue = String(value);
    const normalized = stringValue
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .trim();
    if (!normalized) {
        return null;
    }
    return normalized;
};

/**
 * Fetch the client's approximate city/country information so the backend
 * can persist human-readable login locations. Results are cached per session.
 */
export const getGeoHeaders = async () => {
    if (cachedGeoHeaders) {
        return { ...cachedGeoHeaders };
    }

    if (typeof fetch !== "function") {
        cachedGeoHeaders = {};
        return {};
    }

    try {
        const response = await fetch(GEO_ENDPOINT);
        if (!response.ok) {
            throw new Error("Geo lookup failed");
        }
        const data = await response.json();
        const headers = {};
        const city = sanitizeHeaderValue(data?.city);
        if (city) {
            headers["X-Client-City"] = city;
        }
        const country = sanitizeHeaderValue(data?.country_name || data?.country);
        if (country) {
            headers["X-Client-Country"] = country;
        }
        const region = sanitizeHeaderValue(data?.region);
        if (region) {
            headers["X-Client-Region"] = region;
        }
        const timezone = sanitizeHeaderValue(data?.timezone);
        if (timezone) {
            headers["X-Client-Timezone"] = timezone;
        }
        cachedGeoHeaders = headers;
        return { ...headers };
    } catch (error) {
        cachedGeoHeaders = {};
        return {};
    }
};
