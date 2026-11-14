import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import {
  AdminUser,
  RolePermission,
  CreateUserPayload,
  AssignRolePayload,
} from '../types/user';

export const userApi = {
  listUsers: async (
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: AdminUser[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<{ users: AdminUser[] }>>(
      '/users',
      {
        params: { page, limit },
      },
    );
    return {
      users: res.data.data.users,
      meta: res.data.meta,
    };
  },

  createUser: async (
    payload: CreateUserPayload,
  ): Promise<{ id: number; email: string }> => {
    const res = await apiClient.post<
      ApiResponse<{ user: { id: number; email: string } }>
    >('/users', payload);
    return res.data.data.user;
  },

  activateUser: async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<null>>(
      `/users/${id}/activate`,
    );
    return {
      success: res.data.success,
      message: res.data.message || 'User activated successfully',
    };
  },

  deactivateUser: async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<null>>(
      `/users/${id}/deactivate`,
    );
    return {
      success: res.data.success,
      message: res.data.message || 'User deactivated successfully',
    };
  },

  assignRole: async (
    id: number,
    payload: AssignRolePayload,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<null>>(
      `/users/${id}/role`,
      payload,
    );
    return {
      success: res.data.success,
      message: res.data.message || 'Role assigned successfully',
    };
  },

  listRoles: async (): Promise<RolePermission[]> => {
    const res =
      await apiClient.get<ApiResponse<{ roles: RolePermission[] }>>('/roles');
    return res.data.data.roles;
  },
};
