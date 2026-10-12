export type TaskType =
  | 'WORKFORCE_PLANNING'
  | 'WORKFORCE_REQUEST'
  | 'PAYROLL'
  | 'PAYROLL_PERIOD'
  | 'RECRUITMENT'
  | 'JOB_REQUISITION'
  | 'PROMOTION'
  | 'LEAVE'
  | 'OVERTIME'
  | 'TRAINING';

export type TaskStatus =
  | 'PENDING_APPROVAL'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface UnifiedTask {
  id: string; // e.g. "WORKFORCE_PLANNING-1" or "WF-1"
  rawId: number;
  sourceId: number;
  taskNumber?: string;
  type: TaskType;
  typeLabel: string;
  title: string;
  description: string;
  departmentName?: string;
  departmentId?: number;
  requestedBy?: number;
  requesterEmail?: string;
  requesterRole?: string;
  status: TaskStatus;
  priority: TaskPriority;
  amountOrHeadcount?: string;
  createdAt: string;
  updatedAt?: string;
  pendingDays?: number;
  isOverdue?: boolean;
  canFollowUp?: boolean;
  lastFollowedUpAt?: string | null;
  followUpCount?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
  rawItem?: unknown;
}

export interface TaskFilterState {
  search: string;
  type: TaskType | 'ALL';
  status: TaskStatus | 'ALL';
  departmentId?: number;
  year?: number;
  dateRange?: [string, string] | null;
  priority: TaskPriority | 'ALL';
  onlyMyTasks?: boolean;
}
