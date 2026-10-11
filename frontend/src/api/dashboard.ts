import { apiClient } from './client';
import { ApiResponse, DashboardMetrics } from '../types/api';

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const res =
      await apiClient.get<ApiResponse<DashboardMetrics>>('/reports/dashboard');
    return res.data.data;
  },
};
