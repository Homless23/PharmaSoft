import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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

// Response Interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Transaction API endpoints with pagination support
export const transactionAPI = {
    getTransactions: (page = 1, limit = 10) => 
        api.get(`/transactions?page=${page}&limit=${limit}`),
    addTransaction: (data) => 
        api.post('/transactions', data),
    deleteTransaction: (id) => 
        api.delete(`/transactions/${id}`)
};

export default api;