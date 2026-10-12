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

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';

export interface NotificationItem {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface RecruitmentMetrics {
  vacancies: number;
  applications: number;
  shortlistedCandidates: number;
  interviews: number;
  selectedCandidates: number;
  hiredCandidates: number;
  applicationsByStatus: Record<string, number>;
}

export interface EmployeeReportMetrics {
  totalEmployees: number;
  departmentDistribution: Array<{
    departmentId: number;
    _count: { _all: number };
  }>;
  positionDistribution: Array<{ positionId: number; _count: { _all: number } }>;
  statusDistribution: Record<string, number>;
  hiringTrends: {
    hiredLast30Days: number;
  };
}

export interface AttendanceReportMetrics {
  attendance: Record<string, number>;
  leaves: Record<string, number>;
  totalOvertimeHours: number;
}

export interface PayrollReportMetrics {
  totalPayrollsProcessed: number;
  totals: {
    grossSalary: number;
    basicSalary: number;
    allowances: number;
    overtime: number;
    deductions: number;
    netSalary: number;
  };
}

export interface PerformanceReportMetrics {
  reviewStatus: Record<string, number>;
  averageScore: number;
  employeesOnImprovementPlan: number;
}

export interface TrainingReportMetrics {
  totalParticipation: number;
  completionStatus: Record<string, number>;
  attendanceRate: Record<string, number>;
  averageEvaluationRating: number;
}
