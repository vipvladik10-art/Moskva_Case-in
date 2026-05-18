import { create } from 'zustand';

export type UserRole = 'viewer' | 'admin';

const STORAGE_KEY = 'api_auth_token';
const ROLE_KEY = 'api_auth_role';

interface AuthState {
  token: string | null;
  role: UserRole;
  setAuth: (token: string, role: UserRole) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  role: 'viewer',
  setAuth: (token, role) => {
    sessionStorage.setItem(STORAGE_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
    set({ token, role });
  },
  clearAuth: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    set({ token: null, role: 'viewer' });
  },
  isAdmin: () => get().role === 'admin',
  hydrate: () => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    const role = (sessionStorage.getItem(ROLE_KEY) as UserRole | null) ?? 'viewer';
    if (token) {
      set({ token, role: role === 'admin' ? 'admin' : 'viewer' });
    }
  },
}));
