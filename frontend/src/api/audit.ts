import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import { AuditLog, AuditLogQueryParams } from '../types/audit';

export const auditApi = {
  getAuditLogs: async (
    params?: AuditLogQueryParams,
  ): Promise<{
    logs: AuditLog[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<AuditLog[]>>('/audit-logs', {
      params: {
        page: params?.page,
        limit: params?.limit,
        actorId: params?.actorId,
        module: params?.module,
        action: params?.action,
        entityId: params?.entityId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
    });

    return {
      logs: Array.isArray(res.data.data) ? res.data.data : [],
      meta: res.data.meta,
    };
  },
};
