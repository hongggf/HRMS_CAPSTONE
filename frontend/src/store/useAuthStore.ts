import { create } from 'zustand';
import { User } from '../types/api';

const REFRESH_TOKEN_KEY = 'hrms_refresh_token';
const USER_CACHE_KEY = 'hrms_user_profile';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setInitializing: (isInitializing: boolean) => void;
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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const u =
      parsed && typeof parsed === 'object' && 'user' in parsed
        ? parsed.user
        : parsed;
    if (!u) return null;
    return {
      ...u,
      roles: Array.isArray(u.roles) ? u.roles : [],
    };
  } catch {
    return null;
  }
})();

let onLogoutCallbacks: Array<() => void> = [];

export const registerOnLogout = (cb: () => void) => {
  onLogoutCallbacks.push(cb);
  return () => {
    onLogoutCallbacks = onLogoutCallbacks.filter((fn) => fn !== cb);
  };
};

/**
 * SECURITY ARCHITECTURE & STORAGE TRADE-OFFS:
 * - Access Tokens: Short-lived (15 min) JWTs stored exclusively in-memory inside Zustand state.
 *   Never persisted to disk, localStorage, or IndexedDB.
 * - Refresh Tokens: The backend API contract currently requires refreshToken in JSON request bodies
 *   (POST /auth/refresh and POST /auth/logout) and does not issue HttpOnly cookies.
 *   To support session restoration across page reloads without forcing re-login, refreshToken is saved
 *   to localStorage.
 *   Mitigations: All user output is strictly escaped to eliminate XSS vectors; tokens are immediately
 *   evicted from memory and storage upon explicit logout or refresh rejection.
 * - Cache Clearance: Stale sensitive server query caches and opened tabs are purged on both logout
 *   and account-switching (login) to prevent cross-account data leakage in shared browser sessions.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: null,
  refreshToken: initialRefreshToken,
  // SECURITY: Never assume authenticated on startup without active verified accessToken
  isAuthenticated: false,
  isInitializing: Boolean(initialRefreshToken),

  setInitializing: (isInitializing: boolean) => set({ isInitializing }),

  login: (user: User, accessToken: string, refreshToken: string) => {
    // Purge previous session queries, tabs, and stale sensitive data on login/account switch
    onLogoutCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // Safe callback execution
      }
    });

    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isInitializing: false,
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
    const rawUser =
      user &&
      typeof user === 'object' &&
      'user' in (user as unknown as Record<string, unknown>)
        ? ((user as unknown as Record<string, unknown>).user as User)
        : user;
    const cleanUser = rawUser
      ? {
          ...rawUser,
          roles: Array.isArray(rawUser.roles) ? rawUser.roles : [],
        }
      : null;
    if (cleanUser) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cleanUser));
    }
    set({ user: cleanUser });
  },

  logout: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitializing: false,
    });
    onLogoutCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // Safe callback execution
      }
    });
  },
}));
