import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : '/api/v1');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For httpOnly cookies if used
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.get(`${API_BASE_URL}/auth/refresh-token`, {
          withCredentials: true
        });

        const newAuth = data.data;
        useAuthStore.getState().setAuth(newAuth.user, newAuth.accessToken);
        
        api.defaults.headers.common['Authorization'] = 'Bearer ' + newAuth.accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAuth.accessToken;
        
        processQueue(null, newAuth.accessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
