import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 30000, // Increased to 30 seconds for dashboard loads
});

/**
 * Request interceptor
 * Attach token automatically
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("pq_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor
 * Handle auth errors globally
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("pq_token");
            localStorage.removeItem("pq_user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;
