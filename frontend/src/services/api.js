import axios from 'axios';
import { getApiError } from '../utils/apiError';
import { installApiErrorTelemetryConsole, recordApiErrorTelemetry } from '../utils/apiErrorTelemetry';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

installApiErrorTelemetryConsole();

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = getApiError(error);
    recordApiErrorTelemetry(normalized, error);
    error.apiError = normalized;
    if (error?.response?.data && typeof error.response.data === 'object') {
      const original = error.response.data.message;
      error.response.data.originalMessage = typeof original === 'string' ? original : '';
      error.response.data.message = normalized.message;
      if (!error.response.data.code && normalized.code) {
        error.response.data.code = normalized.code;
      }
      if (!error.response.data.status && normalized.status) {
        error.response.data.status = normalized.status;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
