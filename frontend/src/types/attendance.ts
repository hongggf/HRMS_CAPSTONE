import { Employee } from './employee';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND';

export type RequestStatus =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Shift {
  id: number;
  name: string;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breakDuration: number; // minutes
  workingDays: string; // "1,2,3,4,5"
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    employeeShifts: number;
  };
}

export interface EmployeeShift {
  id: number;
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate?: string | null;
  employee?: Employee;
  shift?: Shift;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyDeparture: number;
  workingMinutes: number;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
}

export interface LeaveType {
  id: number;
  name: string;
  description?: string | null;
  daysAllowed: number;
  isPaid: boolean;
  requiresBalance: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  balance: number;
  used: number;
  createdAt?: string;
  updatedAt?: string;
  leaveType?: LeaveType;
  employee?: Employee;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  reason: string;
  approvedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  leaveType?: LeaveType;
  approver?: {
    id: number;
    email: string;
  } | null;
}

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  date: string;
  hours: number;
  reason: string;
  status: RequestStatus;
  approvedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  approver?: {
    id: number;
    email: string;
  } | null;
}

export interface Timesheet {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  leaveHours?: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
}

export interface CheckInInput {
  employeeId: number;
  date: string;
  time: string;
}

export interface CheckOutInput {
  time: string;
  employeeId?: number;
}

export interface CreateShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workingDays: string;
}

export interface AssignShiftInput {
  employeeId: number;
  shiftId: number;
  startDate: string;
}

export interface CreateLeaveRequestInput {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdateRequestStatusInput {
  status: RequestStatus;
}

export interface CreateOvertimeRequestInput {
  employeeId: number;
  date: string;
  hours: number;
  reason: string;
}

export interface GenerateTimesheetInput {
  employeeId: number;
  startDate: string;
  endDate: string;
}

export interface AttendanceAuditLog {
  id: number;
  actorId: number | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  requestId: string | null;
  timestamp: string;
  user?: {
    email: string;
  } | null;
}

export interface AttendanceReportData {
  attendance: Record<string, number>;
  leaves: Record<string, number>;
  totalOvertimeHours: number;
}

export interface AttendanceCorrection {
  id: number;
  employeeId: number;
  attendanceId?: number;
  date: string;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  reason: string;
  status: RequestStatus;
  actingHrId?: number;
  approvedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
}
