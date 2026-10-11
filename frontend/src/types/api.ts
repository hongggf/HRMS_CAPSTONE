export type RoleName =
  | 'HEAD_OF_HR'
  | 'HR_RECRUITMENT'
  | 'HR_ADMIN'
  | 'HR_ATTENDANCE'
  | 'HR_PAYROLL'
  | 'HR_PERFORMANCE'
  | 'HR_LND';

export interface User {
  id: number;
  email: string;
  isActive?: boolean;
  roles: RoleName[];
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newHires: number;
  pendingWorkforceApprovals: number;
  pendingRecruitmentApprovals: number;
  pendingPayrollApprovals: number;
  attendanceSummary: Record<string, number>;
  leaveSummary: Record<string, number>;
  payrollSummary: {
    total: number;
    netSalary: number;
  };
  performanceSummary: Record<string, number>;
  trainingSummary: Record<string, number>;
}
