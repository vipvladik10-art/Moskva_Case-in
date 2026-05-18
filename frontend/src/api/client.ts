import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  if (url.includes('/auth/login')) {
    return config;
  }
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 403) {
      console.warn('Нужны права администратора');
    }
    return Promise.reject(err);
  },
);
