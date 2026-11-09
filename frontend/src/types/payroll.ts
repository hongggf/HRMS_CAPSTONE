export type PayrollPeriodStatus =
  | 'DRAFT'
  | 'CALCULATING'
  | 'CALCULATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'LOCKED'
  | 'PAID';

export type PayrollItemComponentType =
  | 'ALLOWANCE'
  | 'DEDUCTION'
  | 'BONUS'
  | 'OTHER';

export interface PayrollItem {
  id: number;
  payrollId: number;
  componentName: string;
  componentType: PayrollItemComponentType;
  amount: number;
  description?: string | null;
}

export interface PayrollAdjustment {
  id: number;
  payrollId: number;
  adjustedById: number;
  amount: number;
  type: 'ADDITION' | 'DEDUCTION';
  reason: string;
  date: string;
}

export interface PayrollApproval {
  id: number;
  payrollPeriodId: number;
  approvedById: number;
  status: PayrollPeriodStatus;
  comments?: string | null;
  date: string;
  approvedBy?: {
    id: number;
    email: string;
  };
}

export interface PayrollPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    payrolls: number;
  };
  approvals?: PayrollApproval[];
}

export interface Payroll {
  id: number;
  payrollPeriodId: number;
  employeeId: number;
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalOvertime: number;
  netSalary: number;
  status: PayrollPeriodStatus;
  createdAt: string;
  updatedAt: string;
  payrollPeriod?: PayrollPeriod;
  employee?: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: {
      id: number;
      name: string;
      code: string;
    } | null;
    position?: {
      id: number;
      title: string;
      code: string;
    } | null;
  };
  items?: PayrollItem[];
  adjustments?: PayrollAdjustment[];
}

export interface CreatePayrollPeriodInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface CreateAdjustmentInput {
  amount: number;
  type: 'ADDITION' | 'DEDUCTION';
  reason: string;
}

export interface RejectPayrollInput {
  comments: string;
}

export interface PayrollReportTotals {
  grossSalary: number;
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  netSalary: number;
}

export interface PayrollReportData {
  totalPayrollsProcessed: number;
  totals: PayrollReportTotals;
}

export interface PayrollValidationIssue {
  id: string;
  type: 'ERROR' | 'WARNING';
  category:
    | 'MISSING_COMPENSATION'
    | 'ZERO_OR_NEGATIVE_NET'
    | 'UNAPPROVED_OVERTIME'
    | 'MISSING_ATTENDANCE'
    | 'UNRESOLVED_CORRECTION'
    | 'UNPAID_LEAVE'
    | 'DUPLICATE_ENTRY'
    | 'DATA_INCONSISTENCY';
  employeeId?: number;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  message: string;
  blocking: boolean;
}
