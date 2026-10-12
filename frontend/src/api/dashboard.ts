import { apiClient } from './client';
import {
  ApiResponse,
  DashboardMetrics,
  RecruitmentMetrics,
  EmployeeReportMetrics,
  AttendanceReportMetrics,
  PayrollReportMetrics,
  PerformanceReportMetrics,
  TrainingReportMetrics,
} from '../types/api';

export const dashboardApi = {
  getHeadOfHrMetrics: async (): Promise<DashboardMetrics> => {
    const res =
      await apiClient.get<ApiResponse<DashboardMetrics>>('/reports/dashboard');
    return res.data.data;
  },

  // Backwards compatibility alias
  getMetrics: async (): Promise<DashboardMetrics> => {
    return dashboardApi.getHeadOfHrMetrics();
  },

  getRecruitmentMetrics: async (): Promise<RecruitmentMetrics> => {
    const res = await apiClient.get<ApiResponse<RecruitmentMetrics>>(
      '/reports/recruitment',
    );
    return res.data.data;
  },

  getEmployeeMetrics: async (): Promise<EmployeeReportMetrics> => {
    const res =
      await apiClient.get<ApiResponse<EmployeeReportMetrics>>(
        '/reports/employees',
      );
    return res.data.data;
  },

  getAttendanceMetrics: async (): Promise<AttendanceReportMetrics> => {
    const res = await apiClient.get<ApiResponse<AttendanceReportMetrics>>(
      '/reports/attendance',
    );
    return res.data.data;
  },

  getPayrollMetrics: async (): Promise<PayrollReportMetrics> => {
    const res =
      await apiClient.get<ApiResponse<PayrollReportMetrics>>(
        '/reports/payroll',
      );
    return res.data.data;
  },

  getPerformanceMetrics: async (): Promise<PerformanceReportMetrics> => {
    const res = await apiClient.get<ApiResponse<PerformanceReportMetrics>>(
      '/reports/performance',
    );
    return res.data.data;
  },

  getTrainingMetrics: async (): Promise<TrainingReportMetrics> => {
    const res =
      await apiClient.get<ApiResponse<TrainingReportMetrics>>(
        '/reports/training',
      );
    return res.data.data;
  },
};
