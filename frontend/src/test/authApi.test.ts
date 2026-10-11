import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';

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
});
