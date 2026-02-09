import axios from 'axios';

// Create separate instances for regular API calls and Authentication
// This avoids circular dependency when interceptors use AuthContext if not careful,
// but usually we just use one instance and attach token.
const API_BASE = import.meta.env.VITE_API_BASE;
console.log("five", API_BASE);
const api = axios.create({
    baseURL: `${API_BASE}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
