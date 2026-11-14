import { apiClient } from './client';
import {
  PayrollPeriod,
  Payroll,
  PayrollAdjustment,
  CreatePayrollPeriodInput,
  CreateAdjustmentInput,
  PayrollReportData,
} from '../types/payroll';

export const payrollApi = {
  // Periods
  getPeriods: async (): Promise<PayrollPeriod[]> => {
    const res = await apiClient.get<
      PayrollPeriod[] | { success: boolean; data: PayrollPeriod[] }
    >('/payroll/periods');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getPeriodById: async (id: number): Promise<PayrollPeriod> => {
    const res = await apiClient.get<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >(`/payroll/periods/${id}`);
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  createPeriod: async (
    payload: CreatePayrollPeriodInput,
  ): Promise<PayrollPeriod> => {
    const res = await apiClient.post<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >('/payroll/periods', payload);
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  // Payroll Records for a Period
  getPayrollsByPeriod: async (periodId: number): Promise<Payroll[]> => {
    const res = await apiClient.get<
      Payroll[] | { success: boolean; data: Payroll[] }
    >(`/payroll/${periodId}`);
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  // Lifecycle Workflow Operations
  calculatePayroll: async (
    periodId: number,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      `/payroll/${periodId}/calculate`,
    );
    return res.data;
  },

  submitPayroll: async (periodId: number): Promise<PayrollPeriod> => {
    const res = await apiClient.post<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >(`/payroll/${periodId}/submit`);
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  approvePayroll: async (
    periodId: number,
    comments?: string,
  ): Promise<PayrollPeriod> => {
    const res = await apiClient.post<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >(`/payroll/${periodId}/approve`, { comments });
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  rejectPayroll: async (
    periodId: number,
    comments: string,
  ): Promise<PayrollPeriod> => {
    const res = await apiClient.post<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >(`/payroll/${periodId}/reject`, { comments });
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  lockPayroll: async (periodId: number): Promise<PayrollPeriod> => {
    const res = await apiClient.post<
      PayrollPeriod | { success: boolean; data: PayrollPeriod }
    >(`/payroll/${periodId}/lock`);
    return ((res.data as any)?.data ?? res.data) as PayrollPeriod;
  },

  // Payslip Retrieval (Authorized)
  getPayslip: async (payrollId: number): Promise<Payroll> => {
    const res = await apiClient.get<
      Payroll | { success: boolean; data: Payroll }
    >(`/payroll/payslips/${payrollId}`);
    return ((res.data as any)?.data ?? res.data) as Payroll;
  },

  getMyPayslips: async (): Promise<Payroll[]> => {
    const res = await apiClient.get<
      Payroll[] | { success: boolean; data: Payroll[] }
    >('/payroll/payslips/my');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getEmployeePayslips: async (employeeId: number): Promise<Payroll[]> => {
    const res = await apiClient.get<
      Payroll[] | { success: boolean; data: Payroll[] }
    >(`/payroll/employees/${employeeId}/payslips`);
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  // Adjustments
  createAdjustment: async (
    payrollId: number,
    payload: CreateAdjustmentInput,
  ): Promise<PayrollAdjustment> => {
    const res = await apiClient.post<
      PayrollAdjustment | { success: boolean; data: PayrollAdjustment }
    >(`/payroll/${payrollId}/adjustments`, payload);
    return ((res.data as any)?.data ?? res.data) as PayrollAdjustment;
  },

  // Authoritative Reports
  getPayrollReport: async (params?: {
    departmentId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PayrollReportData> => {
    const res = await apiClient.get<{
      success: boolean;
      message: string;
      data: PayrollReportData;
    }>('/reports/payroll', { params });
    return ((res.data as any)?.data ?? res.data) as PayrollReportData;
  },
};
