import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import {
  WorkforceRequest,
  CreateWorkforceRequestInput,
  UpdateWorkforceRequestInput,
  RejectWorkforceRequestInput,
  ListWorkforceRequestsQuery,
} from '../types/workforce';

export const workforceApi = {
  list: async (
    params?: ListWorkforceRequestsQuery,
  ): Promise<{
    workforceRequests: WorkforceRequest[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<
      ApiResponse<{ workforceRequests: WorkforceRequest[] }>
    >('/workforce-requests', {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        departmentId: params?.departmentId,
      },
    });
    return {
      workforceRequests: res.data.data.workforceRequests,
      meta: res.data.meta,
    };
  },

  getById: async (id: number): Promise<WorkforceRequest> => {
    const res = await apiClient.get<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}`);
    return res.data.data.workforceRequest;
  },

  create: async (
    data: CreateWorkforceRequestInput,
  ): Promise<WorkforceRequest> => {
    const res = await apiClient.post<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >('/workforce-requests', data);
    return res.data.data.workforceRequest;
  },

  update: async (
    id: number,
    data: UpdateWorkforceRequestInput,
  ): Promise<WorkforceRequest> => {
    const res = await apiClient.put<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}`, data);
    return res.data.data.workforceRequest;
  },

  delete: async (
    id: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete<ApiResponse<null>>(
      `/workforce-requests/${id}`,
    );
    return {
      success: res.data.success,
      message: res.data.message,
    };
  },

  submit: async (id: number): Promise<WorkforceRequest> => {
    const res = await apiClient.post<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}/submit`);
    return res.data.data.workforceRequest;
  },

  approve: async (id: number): Promise<WorkforceRequest> => {
    const res = await apiClient.post<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}/approve`);
    return res.data.data.workforceRequest;
  },

  reject: async (
    id: number,
    data: RejectWorkforceRequestInput,
  ): Promise<WorkforceRequest> => {
    const res = await apiClient.post<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}/reject`, data);
    return res.data.data.workforceRequest;
  },

  cancel: async (id: number): Promise<WorkforceRequest> => {
    const res = await apiClient.post<
      ApiResponse<{ workforceRequest: WorkforceRequest }>
    >(`/workforce-requests/${id}/cancel`);
    return res.data.data.workforceRequest;
  },
};
