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

// Safely purge legacy persistent tokens from localStorage to eliminate persistent cross-session auto-restoration
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

// Safely load initial session-scoped refresh token and user cache from sessionStorage
const initialRefreshToken =
  typeof window !== 'undefined'
    ? sessionStorage.getItem(REFRESH_TOKEN_KEY)
    : null;
const initialUser: User | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
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
 * SECURITY ARCHITECTURE:
 * - Access Tokens: Short-lived (15 min) JWTs stored exclusively in-memory inside Zustand state.
 *   Never persisted to disk or storage.
 * - Refresh Tokens: Stored in tab-scoped `sessionStorage` (strictly wiped when browser tab/window closes).
 *   Does NOT persist across separate browser sessions, windows, or after restart.
 *   Enables seamless page refresh (F5) within the active work tab without exposing the session to other users
 *   or auto-logging in when opening new tabs or browsers.
 * - Auto-Purge: Stale sensitive server query caches, opened tabs, and legacy persistent keys are purged on logout
 *   and account-switching to prevent cross-account data leakage in shared browser environments.
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

    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
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
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(cleanUser));
    }
    set({ user: cleanUser });
  },

  logout: () => {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_CACHE_KEY);
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
    } catch {
      // Safe storage clearance
    }
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
