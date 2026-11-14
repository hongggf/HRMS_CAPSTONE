import { apiClient } from './client';
import {
  AttendanceRecord,
  Shift,
  EmployeeShift,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  OvertimeRequest,
  Timesheet,
  CheckInInput,
  CheckOutInput,
  CreateShiftInput,
  AssignShiftInput,
  CreateLeaveRequestInput,
  CreateOvertimeRequestInput,
  GenerateTimesheetInput,
  RequestStatus,
} from '../types/attendance';

export const attendanceApi = {
  // Attendance Punch
  checkIn: async (payload: CheckInInput): Promise<AttendanceRecord> => {
    const res = await apiClient.post<
      AttendanceRecord | { success: boolean; data: AttendanceRecord }
    >('/attendance/check-in', payload);
    return ((res.data as any)?.data ?? res.data) as AttendanceRecord;
  },

  checkOut: async (
    id?: number,
    payload?: CheckOutInput,
  ): Promise<AttendanceRecord> => {
    const url = id ? `/attendance/${id}/check-out` : '/attendance/check-out';
    const res = await apiClient.post<
      AttendanceRecord | { success: boolean; data: AttendanceRecord }
    >(url, payload);
    return ((res.data as any)?.data ?? res.data) as AttendanceRecord;
  },

  getAttendances: async (filters?: {
    employeeId?: number;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get<
      AttendanceRecord[] | { success: boolean; data: AttendanceRecord[] }
    >('/attendance', { params: filters });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getTodayAttendance: async (
    employeeId: number,
  ): Promise<AttendanceRecord | null> => {
    try {
      const res = await apiClient.get<
        AttendanceRecord | { success: boolean; data: AttendanceRecord }
      >(`/attendance/today/${employeeId}`);
      const data = (res.data as any)?.data ?? res.data;
      return (data as AttendanceRecord) || null;
    } catch {
      return null;
    }
  },

  // Shifts
  getShifts: async (): Promise<Shift[]> => {
    const res = await apiClient.get<
      Shift[] | { success: boolean; data: Shift[] }
    >('/shifts');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createShift: async (payload: CreateShiftInput): Promise<Shift> => {
    const res = await apiClient.post<Shift | { success: boolean; data: Shift }>(
      '/shifts',
      payload,
    );
    return ((res.data as any)?.data ?? res.data) as Shift;
  },

  assignShift: async (payload: AssignShiftInput): Promise<EmployeeShift> => {
    const res = await apiClient.post<
      EmployeeShift | { success: boolean; data: EmployeeShift }
    >('/shifts/assign', payload);
    return ((res.data as any)?.data ?? res.data) as EmployeeShift;
  },

  getEmployeeShifts: async (employeeId?: number): Promise<EmployeeShift[]> => {
    const res = await apiClient.get<
      EmployeeShift[] | { success: boolean; data: EmployeeShift[] }
    >('/shifts/assignments', {
      params: employeeId ? { employeeId } : undefined,
    });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  // Leave Management
  getLeaveTypes: async (): Promise<LeaveType[]> => {
    const res = await apiClient.get<
      LeaveType[] | { success: boolean; data: LeaveType[] }
    >('/leave/types');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getLeaveBalances: async (
    employeeId?: number,
    year?: number,
  ): Promise<LeaveBalance[]> => {
    const res = await apiClient.get<
      LeaveBalance[] | { success: boolean; data: LeaveBalance[] }
    >('/leave/balances', { params: { employeeId, year } });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getLeaveRequests: async (filters?: {
    employeeId?: number;
    status?: string;
    leaveTypeId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<LeaveRequest[]> => {
    const res = await apiClient.get<
      LeaveRequest[] | { success: boolean; data: LeaveRequest[] }
    >('/leave', {
      params: filters,
    });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createLeaveRequest: async (
    payload: CreateLeaveRequestInput,
  ): Promise<LeaveRequest> => {
    const res = await apiClient.post<
      LeaveRequest | { success: boolean; data: LeaveRequest }
    >('/leave', payload);
    return ((res.data as any)?.data ?? res.data) as LeaveRequest;
  },

  updateLeaveStatus: async (
    id: number,
    status: RequestStatus,
  ): Promise<LeaveRequest> => {
    const res = await apiClient.put<
      LeaveRequest | { success: boolean; data: LeaveRequest }
    >(`/leave/${id}/status`, { status });
    return ((res.data as any)?.data ?? res.data) as LeaveRequest;
  },

  // Overtime Management
  getOvertimeRequests: async (filters?: {
    employeeId?: number;
    status?: string;
    date?: string;
  }): Promise<OvertimeRequest[]> => {
    const res = await apiClient.get<
      OvertimeRequest[] | { success: boolean; data: OvertimeRequest[] }
    >('/overtime', { params: filters });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createOvertimeRequest: async (
    payload: CreateOvertimeRequestInput,
  ): Promise<OvertimeRequest> => {
    const res = await apiClient.post<
      OvertimeRequest | { success: boolean; data: OvertimeRequest }
    >('/overtime', payload);
    return ((res.data as any)?.data ?? res.data) as OvertimeRequest;
  },

  updateOvertimeStatus: async (
    id: number,
    status: RequestStatus,
  ): Promise<OvertimeRequest> => {
    const res = await apiClient.put<
      OvertimeRequest | { success: boolean; data: OvertimeRequest }
    >(`/overtime/${id}/status`, { status });
    return ((res.data as any)?.data ?? res.data) as OvertimeRequest;
  },

  // Timesheets
  getTimesheets: async (filters?: {
    employeeId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Timesheet[]> => {
    const res = await apiClient.get<
      Timesheet[] | { success: boolean; data: Timesheet[] }
    >('/timesheets', {
      params: filters,
    });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  generateTimesheet: async (
    payload: GenerateTimesheetInput,
  ): Promise<Timesheet> => {
    const res = await apiClient.post<
      Timesheet | { success: boolean; data: Timesheet }
    >('/timesheets/generate', payload);
    return ((res.data as any)?.data ?? res.data) as Timesheet;
  },

  // Reports
  getAttendanceReport: async (filters?: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
  }): Promise<{
    attendance: Record<string, number>;
    leaves: Record<string, number>;
    totalOvertimeHours: number;
  }> => {
    const res = await apiClient.get('/reports/attendance', { params: filters });
    return (
      ((res.data as any)?.data ?? res.data) || {
        attendance: {},
        leaves: {},
        totalOvertimeHours: 0,
      }
    );
  },

  // Audit Logs (Attendance Module)
  getAttendanceAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: any[]; total: number }> => {
    const res = await apiClient.get('/audit-logs', {
      params: { ...params, module: 'ATTENDANCE' },
    });
    const body = res.data as any;
    const logs = body?.data ?? (Array.isArray(body) ? body : []);
    const total = body?.meta?.total ?? logs.length;
    return { logs, total };
  },
};
