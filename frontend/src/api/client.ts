import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 20_000,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // TODO(P2): глобальный обработчик ошибок + тосты
    return Promise.reject(err);
  },
);
