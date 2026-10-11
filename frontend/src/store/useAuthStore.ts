import { create } from 'zustand';
import { User } from '../types/api';

const REFRESH_TOKEN_KEY = 'hrms_refresh_token';
const USER_CACHE_KEY = 'hrms_user_profile';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

// Safely load initial persisted refresh token and user cache
const initialRefreshToken =
  typeof window !== 'undefined'
    ? localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;
const initialUser: User | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: null,
  refreshToken: initialRefreshToken,
  isAuthenticated: Boolean(initialRefreshToken && initialUser),

  login: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  setTokens: (accessToken: string, refreshToken?: string) => {
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      set({ accessToken, refreshToken });
    } else {
      set({ accessToken });
    }
  },

  setUser: (user: User) => {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
