import axios from 'axios';

const api = axios.create({
    // Ensure the port matches your backend PORT in .env
    baseURL: 'http://localhost:5000/api/v1', 
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor for Auth
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;