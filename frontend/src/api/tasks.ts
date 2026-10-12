import { apiClient } from './client';
import {
  UnifiedTask,
  TaskFilterState,
  TaskType,
  TaskStatus,
} from '../types/tasks';
import { ApiResponse } from '../types/api';

interface BackendTaskItem {
  id: string;
  rawId: number;
  taskNumber?: string;
  type: string;
  title: string;
  description: string;
  department?: string;
  departmentId?: number;
  requestedBy?: number;
  requesterEmail?: string;
  status: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt?: string;
  pendingDays?: number;
  isOverdue?: boolean;
  canFollowUp?: boolean;
  lastFollowedUpAt?: string | null;
  followUpCount?: number;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
}

export const tasksApi = {
  getUnifiedTasks: async (
    filters?: Partial<TaskFilterState>,
  ): Promise<UnifiedTask[]> => {
    const params: Record<string, unknown> = { limit: 100 };
    if (filters?.status && filters.status !== 'ALL') {
      params.status = filters.status;
    }
    if (filters?.type && filters.type !== 'ALL') params.type = filters.type;
    if (filters?.priority && filters.priority !== 'ALL') {
      params.priority = filters.priority;
    }
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    if (filters?.year) params.year = filters.year;
    if (filters?.dateRange?.[0]) params.startDate = filters.dateRange[0];
    if (filters?.dateRange?.[1]) params.endDate = filters.dateRange[1];
    if (filters?.search) params.search = filters.search;
    if (filters?.onlyMyTasks) params.onlyMyTasks = true;

    try {
      const res = await apiClient.get<
        ApiResponse<{ tasks: BackendTaskItem[] }>
      >('/tasks', {
        params,
      });
      const rawTasks = res.data.data?.tasks || [];
      return rawTasks.map((t) => ({
        id: t.id,
        rawId: t.rawId,
        sourceId: t.rawId,
        taskNumber: t.taskNumber,
        type: t.type as TaskType,
        typeLabel:
          t.type === 'WORKFORCE_PLANNING' || t.type === 'WORKFORCE_REQUEST'
            ? 'Workforce Headcount'
            : t.type === 'PAYROLL' || t.type === 'PAYROLL_PERIOD'
              ? 'Payroll Cycle'
              : t.type === 'RECRUITMENT' || t.type === 'JOB_REQUISITION'
                ? 'Recruitment Requisition'
                : t.type === 'LEAVE'
                  ? 'Leave Request'
                  : t.type === 'OVERTIME'
                    ? 'Overtime Request'
                    : t.type === 'PROMOTION'
                      ? 'Promotion Request'
                      : t.type === 'TRAINING'
                        ? 'Training Proposal'
                        : t.type,
        title: t.title,
        description: t.description,
        departmentName: t.department,
        departmentId: t.departmentId,
        requestedBy: t.requestedBy,
        requesterEmail: t.requesterEmail,
        status: t.status as TaskStatus,
        priority: t.priority,
        amountOrHeadcount: t.metadata?.headcount
          ? `${t.metadata.headcount} persons`
          : t.metadata?.hours
            ? `${t.metadata.hours} hours`
            : t.metadata?.leaveTypeName
              ? `${t.metadata.leaveTypeName}`
              : t.metadata?.proposedPosition
                ? `To ${t.metadata.proposedPosition}`
                : t.metadata?.budget
                  ? `$${t.metadata.budget}`
                  : 'N/A',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        pendingDays: t.pendingDays,
        isOverdue: t.isOverdue,
        canFollowUp: t.canFollowUp,
        lastFollowedUpAt: t.lastFollowedUpAt,
        followUpCount: t.followUpCount,
        rejectionReason: t.rejectionReason,
        metadata: t.metadata,
        rawItem: t,
      }));
    } catch {
      return [];
    }
  },

  approveTask: async (task: UnifiedTask): Promise<void> => {
    const rawId = task.rawId || task.sourceId;
    await apiClient.post(`/tasks/${task.type}/${rawId}/approve`);
  },

  rejectTask: async (task: UnifiedTask, reason: string): Promise<void> => {
    const rawId = task.rawId || task.sourceId;
    await apiClient.post(`/tasks/${task.type}/${rawId}/reject`, {
      rejectionReason: reason,
    });
  },

  deleteDraftTask: async (task: UnifiedTask): Promise<void> => {
    const rawId = task.rawId || task.sourceId;
    await apiClient.delete(`/tasks/${task.type}/${rawId}`);
  },

  submitDraftTask: async (task: UnifiedTask): Promise<void> => {
    const rawId = task.rawId || task.sourceId;
    await apiClient.post(`/tasks/${task.type}/${rawId}/submit`);
  },

  followUpTask: async (
    task: UnifiedTask,
  ): Promise<{ message?: string; followedUpAt?: string }> => {
    const rawId = task.rawId || task.sourceId;
    const res = await apiClient.post<
      ApiResponse<{ message?: string; followedUpAt?: string }>
    >(`/tasks/${task.type}/${rawId}/follow-up`);
    return res.data.data;
  },

  createTask: async (data: {
    type: string;
    justification: string;
    departmentId?: number;
    positionId?: number;
    headcount?: number;
    submitNow?: boolean;
    leaveTypeId?: number;
    startDate?: string;
    endDate?: string;
    date?: string;
    hours?: number;
    proposedPositionId?: number;
    proposedSalary?: number;
    trainingTitle?: string;
    trainingCategoryId?: number;
    budget?: number;
  }): Promise<{ id: string; rawId: number; type: string; status: string }> => {
    const res = await apiClient.post<
      ApiResponse<{
        task: { id: string; rawId: number; type: string; status: string };
      }>
    >('/tasks', data);
    return res.data.data.task;
  },
};
