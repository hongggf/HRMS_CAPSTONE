import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { InternalAxiosRequestConfig } from 'axios';
import { normalizeApiError, apiClient } from '../api/client';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';
import { notificationApi } from '../api/notification';
import { auditApi } from '../api/audit';
import { useAuthStore, registerOnLogout } from '../store/useAuthStore';

describe('Phase 10: HRMS API Integration Hardening Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
  });

  describe('1. Contract Consistency & Payload Envelopes', () => {
    it('authApi.changePassword sends oldPassword and newPassword matching backend validator', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { message: 'Password changed successfully' },
      });

      const res = await authApi.changePassword(
        'currentSecret123',
        'newSecret456',
      );

      expect(postSpy).toHaveBeenCalledWith('/auth/change-password', {
        oldPassword: 'currentSecret123',
        newPassword: 'newSecret456',
      });
      expect(res.message).toBe('Password changed successfully');
    });

    it('userApi.createUser supports both roleId and roleIds payload structures', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: {
          data: {
            user: { id: 10, email: 'new.officer@hr.local' },
          },
        },
      });

      // Creation with roleId
      await userApi.createUser({
        email: 'new.officer@hr.local',
        password: 'Password123!',
        roleId: 2,
      });

      expect(postSpy).toHaveBeenCalledWith('/users', {
        email: 'new.officer@hr.local',
        password: 'Password123!',
        roleId: 2,
      });

      // Creation with roleIds array (matrix contract format)
      await userApi.createUser({
        email: 'new.officer2@hr.local',
        password: 'Password123!',
        roleIds: [2, 3],
      });

      expect(postSpy).toHaveBeenCalledWith('/users', {
        email: 'new.officer2@hr.local',
        password: 'Password123!',
        roleIds: [2, 3],
      });
    });

    it('userApi.assignRole accepts roleId and roleIds payload', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: {
          success: true,
          message: 'Role assigned successfully',
        },
      });

      await userApi.assignRole(10, { roleId: 2, roleIds: [2, 5] });

      expect(postSpy).toHaveBeenCalledWith('/users/10/role', {
        roleId: 2,
        roleIds: [2, 5],
      });
    });

    it('notificationApi safely handles both unreadCount and legacy count payloads', async () => {
      // Backend returns count and unreadCount
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { count: 7, unreadCount: 7 },
      });

      const unread = await notificationApi.getUnreadCount();
      expect(unread).toBe(7);

      // Backend returns direct array
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: [
          { id: 1, title: 'Alert 1', isRead: false },
          { id: 2, title: 'Alert 2', isRead: true },
        ],
      });

      const list = await notificationApi.getNotifications();
      expect(list).toHaveLength(2);
      expect(list[0].title).toBe('Alert 1');
    });

    it('auditApi restricts operations to read-only queries with verified filter parameters', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: {
          data: [
            {
              id: 1,
              action: 'USER_DEACTIVATED',
              module: 'USER_MANAGEMENT',
              entityType: 'User',
              entityId: '5',
              actorId: 1,
              createdAt: '2026-11-14T10:00:00.000Z',
            },
          ],
          meta: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      });

      const res = await auditApi.getAuditLogs({
        page: 1,
        limit: 20,
        action: 'USER_DEACTIVATED',
        startDate: '2026-11-01',
        endDate: '2026-11-14',
      });

      expect(getSpy).toHaveBeenCalledWith('/audit-logs', {
        params: {
          page: 1,
          limit: 20,
          actorId: undefined,
          module: undefined,
          action: 'USER_DEACTIVATED',
          entityId: undefined,
          startDate: '2026-11-01',
          endDate: '2026-11-14',
        },
      });
      expect(res.logs[0].action).toBe('USER_DEACTIVATED');

      // Verify that auditApi deliberately does NOT expose update or delete methods (immutable audit trail)
      expect((auditApi as any).updateLog).toBeUndefined();
      expect((auditApi as any).deleteLog).toBeUndefined();
    });
  });

  describe('2. Query, Mutation & Sensitive Cache Clearing Behavior', () => {
    it('clears query cache and closes sensitive state on logout or account switch', () => {
      queryClient.setQueryData(['payroll-confidential'], { salary: 150000 });
      queryClient.setQueryData(['user-profile'], { email: 'head@hr.local' });

      expect(queryClient.getQueryData(['payroll-confidential'])).toBeDefined();

      // Register query cache clearing callback on logout
      const unregister = registerOnLogout(() => {
        queryClient.clear();
      });

      // Perform logout
      useAuthStore.getState().logout();

      // Verify all cached sensitive server queries are purged
      expect(
        queryClient.getQueryData(['payroll-confidential']),
      ).toBeUndefined();
      expect(queryClient.getQueryData(['user-profile'])).toBeUndefined();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      unregister();
    });

    it('FormData multipart requests preserve boundary without forced Content-Type', async () => {
      const requestHandlers = (apiClient.interceptors.request as any).handlers;
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

      // The interceptor deletes 'Content-Type' so the browser/runtime generates the multipart boundary
      expect(modifiedConfig.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('3. Common UI Error Handling and Normalization', () => {
    it('normalizes 400 Bad Request with field errors', () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'Validation failed',
              details: [
                { field: 'email', message: 'Email already registered' },
                { field: 'password', message: 'Password is too weak' },
              ],
            },
          },
        },
      };

      const normalized = normalizeApiError(errorResponse);
      expect(normalized.message).toBe('Validation failed');
      expect(normalized.details).toHaveLength(2);
      expect(normalized.details?.[0].field).toBe('email');
    });

    it('normalizes 403 Forbidden with administrative lockout message', () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              code: 'LAST_ADMIN_LOCKOUT',
              message:
                'Cannot demote or deactivate the last remaining administrator',
            },
          },
        },
      };

      const normalized = normalizeApiError(errorResponse);
      expect(normalized.message).toContain('last remaining administrator');
    });

    it('normalizes network offline / timeout errors', () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        code: 'ERR_NETWORK',
        response: undefined,
      };

      const normalized = normalizeApiError(networkError);
      expect(normalized.message).toMatch(/Network error/i);
    });

    it('normalizes 500 Internal Server Error gracefully without crashing', () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            error: {
              message: 'Database connection failed',
            },
          },
        },
      };

      const normalized = normalizeApiError(serverError);
      expect(normalized.message).toBe('Database connection failed');
    });
  });
});
