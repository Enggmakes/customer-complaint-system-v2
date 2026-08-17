import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for LLM calls
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress console error logs for expected 404s on new session initial lookups
    const isExpected404 = error.response?.status === 404 && error.config?.url?.includes('/session/');
    if (!isExpected404) {
      console.warn('API Warning:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
