import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  ListDepartmentsQuery,
  Position,
  CreatePositionInput,
  UpdatePositionInput,
  ListPositionsQuery,
} from '../types/organization';

export const departmentApi = {
  list: async (
    params?: ListDepartmentsQuery,
  ): Promise<{
    departments: Department[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<{ departments: Department[] }>>(
      '/departments',
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          status: params?.status,
        },
      },
    );
    return {
      departments: res.data.data.departments,
      meta: res.data.meta,
    };
  },

  getById: async (id: number): Promise<Department> => {
    const res = await apiClient.get<ApiResponse<{ department: Department }>>(
      `/departments/${id}`,
    );
    return res.data.data.department;
  },

  create: async (data: CreateDepartmentInput): Promise<Department> => {
    const res = await apiClient.post<ApiResponse<{ department: Department }>>(
      '/departments',
      data,
    );
    return res.data.data.department;
  },

  update: async (
    id: number,
    data: UpdateDepartmentInput,
  ): Promise<Department> => {
    const res = await apiClient.put<ApiResponse<{ department: Department }>>(
      `/departments/${id}`,
      data,
    );
    return res.data.data.department;
  },

  delete: async (
    id: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/departments/${id}`);
    return {
      success: res.data.success,
      message: res.data.message,
    };
  },
};

export const positionApi = {
  list: async (
    params?: ListPositionsQuery,
  ): Promise<{ positions: Position[]; meta: ApiResponse<unknown>['meta'] }> => {
    const res = await apiClient.get<ApiResponse<{ positions: Position[] }>>(
      '/positions',
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          departmentId: params?.departmentId,
          status: params?.status,
        },
      },
    );
    return {
      positions: res.data.data.positions,
      meta: res.data.meta,
    };
  },

  getById: async (id: number): Promise<Position> => {
    const res = await apiClient.get<ApiResponse<{ position: Position }>>(
      `/positions/${id}`,
    );
    return res.data.data.position;
  },

  create: async (data: CreatePositionInput): Promise<Position> => {
    const res = await apiClient.post<ApiResponse<{ position: Position }>>(
      '/positions',
      data,
    );
    return res.data.data.position;
  },

  update: async (id: number, data: UpdatePositionInput): Promise<Position> => {
    const res = await apiClient.put<ApiResponse<{ position: Position }>>(
      `/positions/${id}`,
      data,
    );
    return res.data.data.position;
  },

  delete: async (
    id: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/positions/${id}`);
    return {
      success: res.data.success,
      message: res.data.message,
    };
  },
};
