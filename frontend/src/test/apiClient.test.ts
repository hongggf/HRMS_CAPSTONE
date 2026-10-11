import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient, normalizeApiError } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn((config) => actual.default.create(config)),
      post: vi.fn(),
    },
  };
});

interface InterceptorManager<T> {
  handlers: Array<{
    fulfilled: (value: T) => T | Promise<T>;
    rejected: (error: unknown) => unknown;
  }>;
}

describe('apiClient and error normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  describe('normalizeApiError', () => {
    it('extracts backend message and validation details from AxiosError', () => {
      const axiosErr = new AxiosError('Request failed with status code 400');
      axiosErr.response = {
        data: {
          success: false,
          error: {
            message: 'Validation failed',
            details: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too short' },
            ],
          },
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      const normalized = normalizeApiError(axiosErr);
      expect(normalized.message).toBe('Validation failed');
      expect(normalized.details).toHaveLength(2);
      expect(normalized.details?.[0].field).toBe('email');
    });

    it('handles timeout error gracefully', () => {
      const timeoutErr = new AxiosError('timeout of 15000ms exceeded');
      timeoutErr.code = 'ECONNABORTED';

      const normalized = normalizeApiError(timeoutErr);
      expect(normalized.message).toContain('timed out');
    });

    it('handles network disconnection without response', () => {
      const networkErr = new AxiosError('Network Error');
      networkErr.response = undefined;

      const normalized = normalizeApiError(networkErr);
      expect(normalized.message).toContain('Network error');
    });

    it('handles generic Error instances', () => {
      const err = new Error('Custom application crash');
      const normalized = normalizeApiError(err);
      expect(normalized.message).toBe('Custom application crash');
    });

    it('handles unknown non-error objects', () => {
      const normalized = normalizeApiError('raw string error');
      expect(normalized.message).toBe('An unexpected error occurred');
    });
  });

  describe('request interceptor', () => {
    it('attaches Bearer token when accessToken exists in state', async () => {
      useAuthStore.getState().setTokens('valid-jwt-token');

      // Access the request interceptor directly with strict typing
      const requestHandlers = (
        apiClient.interceptors
          .request as unknown as InterceptorManager<InternalAxiosRequestConfig>
      ).handlers;
      const fulfillFn = requestHandlers[0].fulfilled;

      const config = {
        headers: { 'Content-Type': 'application/json' },
      } as unknown as InternalAxiosRequestConfig;

      const modifiedConfig = (await fulfillFn(
        config,
      )) as InternalAxiosRequestConfig;
      expect(modifiedConfig.headers.Authorization).toBe(
        'Bearer valid-jwt-token',
      );
    });

    it('preserves FormData content-type without forcing application/json', async () => {
      useAuthStore.getState().setTokens('valid-jwt-token');

      const requestHandlers = (
        apiClient.interceptors
          .request as unknown as InterceptorManager<InternalAxiosRequestConfig>
      ).handlers;
      const fulfillFn = requestHandlers[0].fulfilled;

      const formData = new FormData();
      const config = {
        data: formData,
        headers: {
          'Content-Type': 'application/json',
        },
      } as unknown as InternalAxiosRequestConfig;

      const modifiedConfig = (await fulfillFn(
        config,
      )) as InternalAxiosRequestConfig;
      expect(modifiedConfig.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('response interceptor and token refresh mutex', () => {
    it('rejects malformed responses where success is false', async () => {
      const responseHandlers = (
        apiClient.interceptors.response as unknown as InterceptorManager<{
          data: unknown;
          config: InternalAxiosRequestConfig;
        }>
      ).handlers;
      const fulfillFn = responseHandlers[0].fulfilled;

      const malformedResponse = {
        data: {
          success: false,
          error: { message: 'Server business logic failure' },
        },
        config: {} as InternalAxiosRequestConfig,
      };

      await expect(fulfillFn(malformedResponse)).rejects.toThrow(
        'Server business logic failure',
      );
    });

    it('prevents refresh loop if request has already been retried', async () => {
      const responseHandlers = (
        apiClient.interceptors
          .response as unknown as InterceptorManager<unknown>
      ).handlers;
      const rejectFn = responseHandlers[0].rejected;

      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

      const error = new AxiosError('Unauthorized');
      error.response = { status: 401 } as AxiosError['response'];
      error.config = {
        url: '/users',
        _retry: true, // Already retried!
      } as InternalAxiosRequestConfig & { _retry?: boolean };

      await expect(rejectFn(error)).rejects.toEqual(error);
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('logs out user when refresh token request fails', async () => {
      useAuthStore
        .getState()
        .login(
          { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
          'expired-access',
          'invalid-refresh',
        );

      vi.spyOn(axios, 'post').mockRejectedValueOnce(
        new Error('Invalid refresh token'),
      );

      const responseHandlers = (
        apiClient.interceptors
          .response as unknown as InterceptorManager<unknown>
      ).handlers;
      const rejectFn = responseHandlers[0].rejected;

      const error = new AxiosError('Unauthorized');
      error.response = { status: 401 } as AxiosError['response'];
      error.config = {
        url: '/users',
        headers: {},
      } as InternalAxiosRequestConfig;

      await expect(rejectFn(error)).rejects.toThrow('Invalid refresh token');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });
});
