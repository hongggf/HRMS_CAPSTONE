import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, registerOnLogout } from '../store/useAuthStore';
import { User } from '../types/api';

describe('useAuthStore', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@hr.local',
    roles: ['HEAD_OF_HR'],
  };

  beforeEach(() => {
    useAuthStore.getState().logout();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('initializes with logged-out state when storage is empty', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updates state and persists refresh token in sessionStorage on login', () => {
    useAuthStore
      .getState()
      .login(mockUser, 'access-token-123', 'refresh-token-456');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token-123');
    expect(state.refreshToken).toBe('refresh-token-456');
    expect(state.isAuthenticated).toBe(true);

    expect(sessionStorage.getItem('hrms_refresh_token')).toBe(
      'refresh-token-456',
    );
    expect(localStorage.getItem('hrms_refresh_token')).toBeNull();
  });

  it('updates accessToken on setTokens', () => {
    useAuthStore.getState().login(mockUser, 'old-access', 'refresh-token');
    useAuthStore.getState().setTokens('new-access');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('refresh-token');
  });

  it('clears state and storage on logout', () => {
    useAuthStore.getState().login(mockUser, 'access', 'refresh');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);

    expect(sessionStorage.getItem('hrms_refresh_token')).toBeNull();
    expect(sessionStorage.getItem('hrms_user_profile')).toBeNull();
    expect(localStorage.getItem('hrms_refresh_token')).toBeNull();
    expect(localStorage.getItem('hrms_user_profile')).toBeNull();
  });

  it('triggers onLogout callbacks on account switching (login with another user) to prevent data leakage', () => {
    const purgeCallback = vi.fn();
    const unregister = registerOnLogout(purgeCallback);

    useAuthStore.getState().login(mockUser, 'user1-token', 'user1-refresh');
    expect(purgeCallback).toHaveBeenCalledTimes(1);

    const user2: User = { id: 2, email: 'user2@hr.local', roles: ['HR_ADMIN'] };
    useAuthStore.getState().login(user2, 'user2-token', 'user2-refresh');
    expect(purgeCallback).toHaveBeenCalledTimes(2);

    unregister();
  });
});
