import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

describe('authApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('login sends credentials and returns response data', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          accessToken: 'mock-access',
          refreshToken: 'mock-refresh',
          user: { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        },
      },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await authApi.login('head@hr.local', 'password123');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'head@hr.local',
      password: 'password123',
    });
    expect(result.accessToken).toBe('mock-access');
    expect(result.user.email).toBe('head@hr.local');
  });

  it('login propagates backend error on invalid credentials', async () => {
    const errorResponse = {
      response: {
        status: 401,
        data: {
          success: false,
          error: { message: 'Invalid email or password' },
        },
      },
    };

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(errorResponse);

    await expect(authApi.login('wrong@hr.local', 'badpass')).rejects.toEqual(
      errorResponse,
    );
  });

  it('refresh sends refreshToken and returns new tokens', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        },
      },
    };

    // axios.post is used directly for refresh to avoid interceptor recursion
    vi.spyOn(axios, 'post').mockResolvedValueOnce(mockResponse);

    const result = await authApi.refresh('old-refresh');

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'old-refresh' },
    );
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('logout sends refreshToken to backend', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Logged out successfully',
        data: null,
      },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await authApi.logout('current-refresh');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'current-refresh',
    });
    expect(result.message).toBe('Logged out successfully');
  });

  it('getMe retrieves authenticated user profile', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          id: 1,
          email: 'head@hr.local',
          isActive: true,
          roles: ['HEAD_OF_HR'],
          permissions: ['ALL'],
        },
      },
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResponse);

    const result = await authApi.getMe();

    expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    expect(result.email).toBe('head@hr.local');
    expect(result.roles).toContain('HEAD_OF_HR');
  });

  it('restoreSession restores tokens and fetches user profile when valid refreshToken exists', async () => {
    useAuthStore.getState().logout();
    localStorage.setItem('hrms_refresh_token', 'valid-persisted-refresh');

    vi.spyOn(authApi, 'refresh').mockResolvedValueOnce({
      accessToken: 'restored-access-token',
      refreshToken: 'valid-persisted-refresh',
    });

    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      id: 1,
      email: 'head@hr.local',
      roles: ['HEAD_OF_HR'],
    });

    // Manually set initial state simulating browser reload with stored refreshToken
    useAuthStore.setState({
      refreshToken: 'valid-persisted-refresh',
      accessToken: null,
      user: null,
      isAuthenticated: true,
    });

    const success = await authApi.restoreSession();

    expect(success).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('restored-access-token');
    expect(useAuthStore.getState().user?.email).toBe('head@hr.local');
  });

  it('restoreSession logs out when refresh fails during session restoration', async () => {
    useAuthStore.setState({
      refreshToken: 'expired-persisted-refresh',
      accessToken: null,
      user: null,
      isAuthenticated: true,
    });

    vi.spyOn(authApi, 'refresh').mockRejectedValueOnce(
      new Error('Token expired'),
    );

    const success = await authApi.restoreSession();

    expect(success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });
});
