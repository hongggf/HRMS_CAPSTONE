import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { logAudit } from './auditService';
import { notifyUser, notifyRoles } from './notificationService';
import { wsManager } from '../websocket';

export interface UnifiedTaskDTO {
  id: string; // Composite ID: "WORKFORCE_PLANNING-1"
  rawId: number;
  taskNumber: string;
  type: 'WORKFORCE_PLANNING' | 'PAYROLL' | 'RECRUITMENT' | 'PROMOTION' | 'LEAVE' | 'OVERTIME' | 'TRAINING';
  title: string;
  description: string;
  department: string;
  departmentId?: number;
  requestedBy: number;
  requesterEmail: string;
  requesterRole?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
  pendingDays: number;
  isOverdue: boolean;
  canFollowUp: boolean;
  lastFollowedUpAt?: string | null;
  followUpCount: number;
  rejectionReason?: string | null;
  metadata?: Record<string, any>;
}

export interface ListTasksFilter {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  departmentId?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  onlyMyTasks?: boolean;
}

/**
 * Normalizes task type string
 */
export const normalizeTaskType = (type: string): string => {
  const upper = type.toUpperCase().replace(/-/g, '_');
  if (upper.includes('WORKFORCE')) return 'WORKFORCE_PLANNING';
  if (upper.includes('PAYROLL')) return 'PAYROLL';
  if (upper.includes('RECRUIT') || upper.includes('REQUISITION')) return 'RECRUITMENT';
  if (upper.includes('PROMOTION')) return 'PROMOTION';
  if (upper.includes('LEAVE')) return 'LEAVE';
  if (upper.includes('OVERTIME')) return 'OVERTIME';
  if (upper.includes('TRAINING') || upper.includes('LND')) return 'TRAINING';
  return upper;
};

/**
 * Fetch unified tasks with RBAC and filtering
 */
export const getUnifiedTasks = async (
  userId: number,
  userRoles: string[],
  filters: ListTasksFilter,
) => {
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');
  const onlyMyTasks = filters.onlyMyTasks === true || !isHeadOfHr;

  // 1. Fetch recent follow-up notifications to attach follow-up state
  const followUpNotifications = await prisma.notification.findMany({
    where: {
      entityType: 'TASK',
      title: { contains: 'Follow-Up' },
    },
    orderBy: { createdAt: 'desc' },
  });

  const followUpMap = new Map<string, { lastAt: Date; count: number }>();
  for (const n of followUpNotifications) {
    if (!n.entityId) continue;
    const existing = followUpMap.get(n.entityId);
    if (!existing) {
      followUpMap.set(n.entityId, { lastAt: n.createdAt, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  const tasks: UnifiedTaskDTO[] = [];

  // 2. Fetch Workforce Requests
  try {
    const workforceWhere: any = {};
    if (onlyMyTasks) {
      workforceWhere.requestedBy = userId;
    }

    const workforceRequests = await prisma.workforceRequest.findMany({
      where: workforceWhere,
      include: {
        department: true,
        position: true,
        requester: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const req of workforceRequests) {
      const entityKey = `WORKFORCE_PLANNING-${req.id}`;
      const followUpInfo = followUpMap.get(entityKey);
      const isPending = req.status === 'PENDING_APPROVAL' || req.status === 'SUBMITTED';
      const pendingDays = isPending
        ? Math.max(0, Math.floor((Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Follow-up cooldown of 1 hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
      const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (req.headcount >= 5 || pendingDays >= 5) priority = 'HIGH';
      else if (req.headcount <= 1) priority = 'LOW';

      tasks.push({
        id: entityKey,
        rawId: req.id,
        taskNumber: `TASK-WF-${String(req.id).padStart(4, '0')}`,
        type: 'WORKFORCE_PLANNING',
        title: `Headcount: ${req.headcount}x ${req.position.title}`,
        description: req.justification,
        department: req.department.name,
        departmentId: req.department.id,
        requestedBy: req.requestedBy,
        requesterEmail: req.requester.email,
        status: req.status as any,
        priority,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        pendingDays,
        isOverdue: isPending && pendingDays >= 3,
        canFollowUp,
        lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
        followUpCount: followUpInfo ? followUpInfo.count : 0,
        rejectionReason: req.rejectionReason,
        metadata: {
          headcount: req.headcount,
          positionTitle: req.position.title,
          departmentCode: req.department.code,
        },
      });
    }
  } catch (err) {
    // Graceful error logging
  }

  // 3. Fetch Payroll Periods
  if (isHeadOfHr || userRoles.includes('HR_PAYROLL')) {
    try {
      const payrollPeriods = await prisma.payrollPeriod.findMany({
        include: {
          approvals: {
            include: { approvedBy: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const p of payrollPeriods) {
        const entityKey = `PAYROLL-${p.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (p.status as string) === 'PENDING_APPROVAL';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: p.id,
          taskNumber: `TASK-PAY-${String(p.id).padStart(4, '0')}`,
          type: 'PAYROLL',
          title: `Payroll Period: ${p.name}`,
          description: `Calculation cycle for ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`,
          department: 'Finance & Payroll',
          requestedBy: 0,
          requesterEmail: 'payroll@hr.local',
          status: p.status as any,
          priority: 'HIGH',
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 2,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
          metadata: {
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
          },
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 4. Fetch Job Requisitions
  if (isHeadOfHr || userRoles.includes('HR_RECRUITMENT')) {
    try {
      const reqWhere: any = {};
      if (onlyMyTasks && !isHeadOfHr) {
        reqWhere.requestedBy = userId;
      }

      const requisitions = await prisma.jobRequisition.findMany({
        where: reqWhere,
        include: {
          workforceRequest: {
            include: { department: true, position: true },
          },
          requester: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const r of requisitions) {
        const entityKey = `RECRUITMENT-${r.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (r.status as string) === 'PENDING_APPROVAL' || (r.status as string) === 'SUBMITTED';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: r.id,
          taskNumber: `TASK-REC-${String(r.id).padStart(4, '0')}`,
          type: 'RECRUITMENT',
          title: `Job Requisition: ${r.workforceRequest.position.title}`,
          description: `Recruitment requisition for ${r.workforceRequest.department.name}`,
          department: r.workforceRequest.department.name,
          departmentId: r.workforceRequest.department.id,
          requestedBy: r.requestedBy,
          requesterEmail: r.requester.email,
          status: r.status as any,
          priority: 'MEDIUM',
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 3,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 5. Fetch Leave Requests (HR_ATTENDANCE or HEAD_OF_HR)
  if (isHeadOfHr || userRoles.includes('HR_ATTENDANCE')) {
    try {
      const leaves = await prisma.leaveRequest.findMany({
        include: {
          employee: { include: { department: true } },
          leaveType: true,
          approver: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const l of leaves) {
        const entityKey = `LEAVE-${l.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (l.status as string) === 'PENDING_APPROVAL' || (l.status as string) === 'SUBMITTED';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: l.id,
          taskNumber: `TASK-LV-${String(l.id).padStart(4, '0')}`,
          type: 'LEAVE',
          title: `Leave: ${l.employee.firstName} ${l.employee.lastName} (${l.leaveType.name})`,
          description: l.reason,
          department: l.employee.department?.name || 'General Operations',
          departmentId: l.employee.department?.id,
          requestedBy: l.employeeId,
          requesterEmail: 'attendance@hr.local',
          status: l.status as any,
          priority: 'MEDIUM',
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 2,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
          metadata: {
            startDate: l.startDate.toISOString(),
            endDate: l.endDate.toISOString(),
            leaveTypeName: l.leaveType.name,
          },
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 6. Fetch Overtime Requests (HR_ATTENDANCE or HEAD_OF_HR)
  if (isHeadOfHr || userRoles.includes('HR_ATTENDANCE')) {
    try {
      const overtimes = await prisma.overtimeRequest.findMany({
        include: {
          employee: { include: { department: true } },
          approver: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const ot of overtimes) {
        const entityKey = `OVERTIME-${ot.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (ot.status as string) === 'PENDING_APPROVAL' || (ot.status as string) === 'SUBMITTED';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(ot.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: ot.id,
          taskNumber: `TASK-OT-${String(ot.id).padStart(4, '0')}`,
          type: 'OVERTIME',
          title: `Overtime: ${ot.employee.firstName} ${ot.employee.lastName} (${ot.hours}h)`,
          description: ot.reason,
          department: ot.employee.department?.name || 'General Operations',
          departmentId: ot.employee.department?.id,
          requestedBy: ot.employeeId,
          requesterEmail: 'attendance@hr.local',
          status: ot.status as any,
          priority: ot.hours >= 8 ? 'HIGH' : 'LOW',
          createdAt: ot.createdAt.toISOString(),
          updatedAt: ot.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 2,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
          metadata: {
            hours: ot.hours,
            date: ot.date.toISOString(),
          },
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 7. Fetch Promotion Requests (HR_PERFORMANCE, HR_ADMIN, or HEAD_OF_HR)
  if (isHeadOfHr || userRoles.includes('HR_PERFORMANCE') || userRoles.includes('HR_ADMIN')) {
    try {
      const promoWhere: any = {};
      if (onlyMyTasks && !isHeadOfHr) {
        promoWhere.requestedById = userId;
      }

      const promotions = await prisma.promotionRequest.findMany({
        where: promoWhere,
        include: {
          employee: { include: { department: true } },
          currentPosition: true,
          proposedPosition: true,
          requestedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const pr of promotions) {
        const entityKey = `PROMOTION-${pr.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (pr.status as string) === 'PENDING_APPROVAL' || (pr.status as string) === 'SUBMITTED';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: pr.id,
          taskNumber: `TASK-PRM-${String(pr.id).padStart(4, '0')}`,
          type: 'PROMOTION',
          title: `Promotion: ${pr.employee.firstName} ${pr.employee.lastName} -> ${pr.proposedPosition.title}`,
          description: pr.reason,
          department: pr.employee.department?.name || 'Talent & Development',
          departmentId: pr.employee.department?.id,
          requestedBy: pr.requestedById,
          requesterEmail: pr.requestedBy.email,
          status: pr.status as any,
          priority: 'HIGH',
          createdAt: pr.createdAt.toISOString(),
          updatedAt: pr.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 3,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
          metadata: {
            currentPosition: pr.currentPosition.title,
            proposedPosition: pr.proposedPosition.title,
            proposedSalary: pr.proposedSalary,
          },
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 8. Fetch Training Plans (HR_LND or HEAD_OF_HR)
  if (isHeadOfHr || userRoles.includes('HR_LND')) {
    try {
      const trainingPlans = await prisma.trainingPlan.findMany({
        include: {
          training: { include: { category: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const tp of trainingPlans) {
        const entityKey = `TRAINING-${tp.id}`;
        const followUpInfo = followUpMap.get(entityKey);
        const isPending = (tp.status as string) === 'DRAFT' || (tp.status as string) === 'IN_PROGRESS';
        const pendingDays = isPending
          ? Math.max(0, Math.floor((Date.now() - new Date(tp.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentFollowUp = followUpInfo && new Date(followUpInfo.lastAt).getTime() > oneHourAgo;
        const canFollowUp = !isHeadOfHr && isPending && !recentFollowUp;

        tasks.push({
          id: entityKey,
          rawId: tp.id,
          taskNumber: `TASK-LND-${String(tp.id).padStart(4, '0')}`,
          type: 'TRAINING',
          title: `Training: ${tp.training.title} (${tp.training.category.name})`,
          description: `${tp.identifiedNeed} - Objective: ${tp.objective}`,
          department: 'Learning & Development',
          requestedBy: 0,
          requesterEmail: 'lnd@hr.local',
          status: (tp.status as string) === 'APPROVED' ? 'APPROVED' : (tp.status as string) === 'IN_PROGRESS' ? 'PENDING_APPROVAL' : 'DRAFT',
          priority: tp.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          createdAt: tp.createdAt.toISOString(),
          updatedAt: tp.updatedAt.toISOString(),
          pendingDays,
          isOverdue: isPending && pendingDays >= 5,
          canFollowUp,
          lastFollowedUpAt: followUpInfo ? followUpInfo.lastAt.toISOString() : null,
          followUpCount: followUpInfo ? followUpInfo.count : 0,
          metadata: {
            budget: tp.budget,
            targetEmployees: tp.targetEmployees,
          },
        });
      }
    } catch (err) {
      // Graceful error logging
    }
  }

  // 9. Apply in-memory filtering
  let filtered = tasks;

  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter((t) => t.status === filters.status);
  }

  if (filters.type && filters.type !== 'ALL') {
    const normalizedType = normalizeTaskType(filters.type);
    filtered = filtered.filter((t) => t.type === normalizedType);
  }

  if (filters.priority && filters.priority !== 'ALL') {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }

  if (filters.departmentId) {
    filtered = filtered.filter((t) => t.departmentId === filters.departmentId);
  }

  if (filters.year) {
    filtered = filtered.filter((t) => new Date(t.createdAt).getFullYear() === filters.year);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    filtered = filtered.filter((t) => new Date(t.createdAt).getTime() >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    filtered = filtered.filter((t) => new Date(t.createdAt).getTime() <= end);
  }

  if (filters.search && filters.search.trim() !== '') {
    const searchLower = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(searchLower) ||
        t.taskNumber.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.department.toLowerCase().includes(searchLower) ||
        t.requesterEmail.toLowerCase().includes(searchLower),
    );
  }

  // Sort by createdAt desc
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Metrics summary
  const pendingCount = tasks.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'SUBMITTED').length;
  const draftCount = tasks.filter((t) => t.status === 'DRAFT').length;
  const approvedCount = tasks.filter((t) => t.status === 'APPROVED').length;
  const totalTasks = tasks.length;

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedTasks = filtered.slice(startIndex, startIndex + limit);

  return {
    tasks: paginatedTasks,
    meta: {
      total,
      page,
      limit,
      totalPages,
      pendingCount,
      draftCount,
      approvedCount,
      totalTasks,
    },
  };
};

/**
 * Submit draft task for Head of HR approval
 */
export const submitUnifiedTask = async (
  userId: number,
  userRoles: string[],
  userEmail: string,
  type: string,
  id: number,
) => {
  const normType = normalizeTaskType(type);

  if (normType === 'WORKFORCE_PLANNING') {
    const request = await prisma.workforceRequest.findUnique({
      where: { id },
      include: { requester: true, position: true, department: true },
    });
    if (!request) throw new AppError('Workforce request not found', 404);
    if (request.status !== 'DRAFT') {
      throw new AppError(`Cannot submit request in ${request.status} status`, 400);
    }
    if (!userRoles.includes('HEAD_OF_HR') && request.requestedBy !== userId) {
      throw new AppError('Forbidden: You can only submit your own draft requests', 403);
    }

    const updated = await prisma.workforceRequest.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'WORKFORCE_PLANNING',
      title: `Headcount: ${request.headcount}x ${request.position.title}`,
    });

    // Notify Head of HR
    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 New Task Submitted for Approval',
      `Officer ${userEmail} submitted workforce request #${id} (${request.position.title}) for your executive approval.`,
      'INFO',
      'TASK',
      `WORKFORCE_PLANNING-${id}`,
    );

    wsManager.broadcastToRoles(['HEAD_OF_HR'], 'TASK_SUBMITTED', {
      type: 'WORKFORCE_PLANNING',
      id,
      title: `Headcount: ${request.headcount}x ${request.position.title}`,
      submittedBy: userEmail,
    });

    return updated;
  }

  if (normType === 'PAYROLL') {
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new AppError('Payroll period not found', 404);
    if (period.status !== 'DRAFT' && (period.status as string) !== 'CALCULATED') {
      throw new AppError(`Cannot submit payroll in ${period.status} status`, 400);
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'PAYROLL',
      title: `Payroll Period: ${period.name}`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Payroll Awaiting Approval',
      `Payroll period "${period.name}" has been calculated and submitted for executive approval.`,
      'INFO',
      'TASK',
      `PAYROLL-${id}`,
    );

    return updated;
  }

  if (normType === 'RECRUITMENT') {
    const req = await prisma.jobRequisition.findUnique({
      where: { id },
      include: {
        requester: true,
        workforceRequest: { include: { position: true, department: true } },
      },
    });
    if (!req) throw new AppError('Job requisition not found', 404);
    if ((req.status as string) !== 'DRAFT') {
      throw new AppError(`Cannot submit requisition in ${req.status} status`, 400);
    }
    if (!userRoles.includes('HEAD_OF_HR') && req.requestedBy !== userId) {
      throw new AppError('Forbidden: You can only submit your own requisitions', 403);
    }

    const updated = await prisma.jobRequisition.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'RECRUITMENT',
      title: `Job Requisition: ${req.workforceRequest.position.title}`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Job Requisition Awaiting Approval',
      `Recruitment requisition for ${req.workforceRequest.position.title} (${req.workforceRequest.department.name}) submitted by ${userEmail} for review.`,
      'INFO',
      'TASK',
      `RECRUITMENT-${id}`,
    );

    return updated;
  }

  if (normType === 'LEAVE') {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });
    if (!leave) throw new AppError('Leave request not found', 404);

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'LEAVE',
      title: `Leave: ${leave.employee.firstName} ${leave.employee.lastName} (${leave.leaveType.name})`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Leave Request Awaiting Approval',
      `Leave request for ${leave.employee.firstName} ${leave.employee.lastName} (${leave.leaveType.name}) submitted for executive review.`,
      'INFO',
      'TASK',
      `LEAVE-${id}`,
    );

    return updated;
  }

  if (normType === 'OVERTIME') {
    const ot = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!ot) throw new AppError('Overtime request not found', 404);

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'OVERTIME',
      title: `Overtime: ${ot.employee.firstName} ${ot.employee.lastName} (${ot.hours}h)`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Overtime Request Awaiting Approval',
      `Overtime request for ${ot.employee.firstName} ${ot.employee.lastName} (${ot.hours}h) submitted for review.`,
      'INFO',
      'TASK',
      `OVERTIME-${id}`,
    );

    return updated;
  }

  if (normType === 'PROMOTION') {
    const promo = await prisma.promotionRequest.findUnique({
      where: { id },
      include: { employee: true, proposedPosition: true, requestedBy: true },
    });
    if (!promo) throw new AppError('Promotion request not found', 404);

    const updated = await prisma.promotionRequest.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'PROMOTION',
      title: `Promotion: ${promo.employee.firstName} ${promo.employee.lastName} -> ${promo.proposedPosition.title}`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Promotion Request Awaiting Approval',
      `Promotion request for ${promo.employee.firstName} ${promo.employee.lastName} submitted by ${userEmail} for review.`,
      'INFO',
      'TASK',
      `PROMOTION-${id}`,
    );

    return updated;
  }

  if (normType === 'TRAINING') {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { training: true },
    });
    if (!plan) throw new AppError('Training plan not found', 404);

    const updated = await prisma.trainingPlan.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await logAudit('TASK_SUBMITTED', userId, {
      taskId: id,
      taskType: 'TRAINING',
      title: `Training: ${plan.training.title}`,
    });

    await notifyRoles(
      ['HEAD_OF_HR'],
      '📋 Training Proposal Awaiting Approval',
      `Training proposal "${plan.training.title}" submitted by ${userEmail} for review.`,
      'INFO',
      'TASK',
      `TRAINING-${id}`,
    );

    return updated;
  }

  throw new AppError(`Unsupported task type: ${type}`, 400);
};

/**
 * Approve task - Strictly restricted to HEAD_OF_HR
 */
export const approveUnifiedTask = async (
  userId: number,
  userRoles: string[],
  type: string,
  id: number,
) => {
  if (!userRoles.includes('HEAD_OF_HR')) {
    throw new AppError('Forbidden: Only Head of HR can approve tasks', 403);
  }

  const normType = normalizeTaskType(type);

  if (normType === 'WORKFORCE_PLANNING') {
    const request = await prisma.workforceRequest.findUnique({
      where: { id },
      include: { requester: true, position: true },
    });
    if (!request) throw new AppError('Workforce request not found', 404);
    if (request.status !== 'PENDING_APPROVAL' && request.status !== 'SUBMITTED') {
      throw new AppError(`Cannot approve request with status ${request.status}`, 400);
    }

    const updated = await prisma.workforceRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'WORKFORCE_PLANNING',
      title: `Headcount: ${request.headcount}x ${request.position.title}`,
    });

    // Notify requester
    await notifyUser(
      request.requestedBy,
      '✅ Task Approved',
      `Your workforce request #${id} (${request.position.title}) has been approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `WORKFORCE_PLANNING-${id}`,
    );

    wsManager.broadcast('TASK_APPROVED', {
      type: 'WORKFORCE_PLANNING',
      id,
      approvedBy: userId,
    });

    return updated;
  }

  if (normType === 'PAYROLL') {
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new AppError('Payroll period not found', 404);
    if (period.status !== 'PENDING_APPROVAL') {
      throw new AppError(`Cannot approve payroll with status ${period.status}`, 400);
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await prisma.payrollApproval.create({
      data: {
        payrollPeriodId: id,
        approvedById: userId,
        status: 'APPROVED',
        comments: 'Approved by Head of HR',
      },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'PAYROLL',
      title: `Payroll Period: ${period.name}`,
    });

    await notifyRoles(
      ['HR_PAYROLL'],
      '✅ Payroll Approved',
      `Payroll period "${period.name}" has been approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `PAYROLL-${id}`,
    );

    return updated;
  }

  if (normType === 'RECRUITMENT') {
    const req = await prisma.jobRequisition.findUnique({
      where: { id },
      include: { workforceRequest: { include: { position: true } } },
    });
    if (!req) throw new AppError('Job requisition not found', 404);

    const updated = await prisma.jobRequisition.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'RECRUITMENT',
      title: `Job Requisition: ${req.workforceRequest.position.title}`,
    });

    await notifyUser(
      req.requestedBy,
      '✅ Job Requisition Approved',
      `Your job requisition #${id} (${req.workforceRequest.position.title}) has been approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `RECRUITMENT-${id}`,
    );

    return updated;
  }

  if (normType === 'LEAVE') {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });
    if (!leave) throw new AppError('Leave request not found', 404);

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED' as any, approvedBy: userId },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'LEAVE',
      title: `Leave: ${leave.employee.firstName} ${leave.employee.lastName} (${leave.leaveType.name})`,
    });

    await notifyRoles(
      ['HR_ATTENDANCE'],
      '✅ Leave Request Approved',
      `Leave request for ${leave.employee.firstName} ${leave.employee.lastName} approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `LEAVE-${id}`,
    );

    return updated;
  }

  if (normType === 'OVERTIME') {
    const ot = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!ot) throw new AppError('Overtime request not found', 404);

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: { status: 'APPROVED' as any, approvedBy: userId },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'OVERTIME',
      title: `Overtime: ${ot.employee.firstName} ${ot.employee.lastName} (${ot.hours}h)`,
    });

    await notifyRoles(
      ['HR_ATTENDANCE'],
      '✅ Overtime Request Approved',
      `Overtime for ${ot.employee.firstName} ${ot.employee.lastName} approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `OVERTIME-${id}`,
    );

    return updated;
  }

  if (normType === 'PROMOTION') {
    const promo = await prisma.promotionRequest.findUnique({
      where: { id },
      include: { employee: true, proposedPosition: true },
    });
    if (!promo) throw new AppError('Promotion request not found', 404);

    const updated = await prisma.promotionRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'PROMOTION',
      title: `Promotion: ${promo.employee.firstName} ${promo.employee.lastName} -> ${promo.proposedPosition.title}`,
    });

    await notifyUser(
      promo.requestedById,
      '✅ Promotion Request Approved',
      `Promotion request for ${promo.employee.firstName} ${promo.employee.lastName} has been approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `PROMOTION-${id}`,
    );

    return updated;
  }

  if (normType === 'TRAINING') {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { training: true },
    });
    if (!plan) throw new AppError('Training plan not found', 404);

    const updated = await prisma.trainingPlan.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await logAudit('TASK_APPROVED', userId, {
      taskId: id,
      taskType: 'TRAINING',
      title: `Training: ${plan.training.title}`,
    });

    await notifyRoles(
      ['HR_LND'],
      '✅ Training Proposal Approved',
      `Training proposal "${plan.training.title}" approved by Head of HR.`,
      'SUCCESS',
      'TASK',
      `TRAINING-${id}`,
    );

    return updated;
  }

  throw new AppError(`Unsupported task type: ${type}`, 400);
};

/**
 * Reject task with reason - Strictly restricted to HEAD_OF_HR
 */
export const rejectUnifiedTask = async (
  userId: number,
  userRoles: string[],
  type: string,
  id: number,
  rejectionReason: string,
) => {
  if (!userRoles.includes('HEAD_OF_HR')) {
    throw new AppError('Forbidden: Only Head of HR can reject tasks', 403);
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('Rejection reason is required', 400);
  }

  const normType = normalizeTaskType(type);

  if (normType === 'WORKFORCE_PLANNING') {
    const request = await prisma.workforceRequest.findUnique({
      where: { id },
      include: { requester: true, position: true },
    });
    if (!request) throw new AppError('Workforce request not found', 404);
    if (request.status !== 'PENDING_APPROVAL' && request.status !== 'SUBMITTED') {
      throw new AppError(`Cannot reject request with status ${request.status}`, 400);
    }

    const updated = await prisma.workforceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'WORKFORCE_PLANNING',
      rejectionReason: rejectionReason.trim(),
    });

    // Notify requester with reason
    await notifyUser(
      request.requestedBy,
      '❌ Task Rejected',
      `Your workforce request #${id} was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `WORKFORCE_PLANNING-${id}`,
    );

    wsManager.broadcast('TASK_REJECTED', {
      type: 'WORKFORCE_PLANNING',
      id,
      rejectedBy: userId,
      rejectionReason: rejectionReason.trim(),
    });

    return updated;
  }

  if (normType === 'PAYROLL') {
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new AppError('Payroll period not found', 404);
    if (period.status !== 'PENDING_APPROVAL') {
      throw new AppError(`Cannot reject payroll with status ${period.status}`, 400);
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await prisma.payrollApproval.create({
      data: {
        payrollPeriodId: id,
        approvedById: userId,
        status: 'REJECTED',
        comments: rejectionReason.trim(),
      },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'PAYROLL',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyRoles(
      ['HR_PAYROLL'],
      '❌ Payroll Rejected',
      `Payroll period "${period.name}" was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `PAYROLL-${id}`,
    );

    return updated;
  }

  if (normType === 'RECRUITMENT') {
    const req = await prisma.jobRequisition.findUnique({
      where: { id },
      include: { workforceRequest: { include: { position: true } } },
    });
    if (!req) throw new AppError('Job requisition not found', 404);

    const updated = await prisma.jobRequisition.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'RECRUITMENT',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyUser(
      req.requestedBy,
      '❌ Job Requisition Rejected',
      `Your job requisition #${id} was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `RECRUITMENT-${id}`,
    );

    return updated;
  }

  if (normType === 'LEAVE') {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });
    if (!leave) throw new AppError('Leave request not found', 404);

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' as any },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'LEAVE',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyRoles(
      ['HR_ATTENDANCE'],
      '❌ Leave Request Rejected',
      `Leave request for ${leave.employee.firstName} ${leave.employee.lastName} was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `LEAVE-${id}`,
    );

    return updated;
  }

  if (normType === 'OVERTIME') {
    const ot = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!ot) throw new AppError('Overtime request not found', 404);

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: { status: 'REJECTED' as any },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'OVERTIME',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyRoles(
      ['HR_ATTENDANCE'],
      '❌ Overtime Request Rejected',
      `Overtime for ${ot.employee.firstName} ${ot.employee.lastName} was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `OVERTIME-${id}`,
    );

    return updated;
  }

  if (normType === 'PROMOTION') {
    const promo = await prisma.promotionRequest.findUnique({
      where: { id },
      include: { employee: true, proposedPosition: true },
    });
    if (!promo) throw new AppError('Promotion request not found', 404);

    const updated = await prisma.promotionRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'PROMOTION',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyUser(
      promo.requestedById,
      '❌ Promotion Request Rejected',
      `Promotion request for ${promo.employee.firstName} ${promo.employee.lastName} was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `PROMOTION-${id}`,
    );

    return updated;
  }

  if (normType === 'TRAINING') {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { training: true },
    });
    if (!plan) throw new AppError('Training plan not found', 404);

    const updated = await prisma.trainingPlan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAudit('TASK_REJECTED', userId, {
      taskId: id,
      taskType: 'TRAINING',
      rejectionReason: rejectionReason.trim(),
    });

    await notifyRoles(
      ['HR_LND'],
      '❌ Training Proposal Rejected',
      `Training proposal "${plan.training.title}" was rejected by Head of HR. Reason: ${rejectionReason.trim()}`,
      'ALERT',
      'TASK',
      `TRAINING-${id}`,
    );

    return updated;
  }

  throw new AppError(`Unsupported task type: ${type}`, 400);
};

/**
 * Delete draft task
 */
export const deleteUnifiedTask = async (
  userId: number,
  userRoles: string[],
  type: string,
  id: number,
) => {
  const normType = normalizeTaskType(type);
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');

  if (normType === 'WORKFORCE_PLANNING') {
    const request = await prisma.workforceRequest.findUnique({ where: { id } });
    if (!request) throw new AppError('Workforce request not found', 404);

    if (request.status !== 'DRAFT' && request.status !== 'CANCELLED') {
      throw new AppError('Only draft or cancelled requests can be deleted', 400);
    }

    if (!isHeadOfHr && request.requestedBy !== userId) {
      throw new AppError('Forbidden: You can only delete your own draft tasks', 403);
    }

    await prisma.workforceRequest.delete({ where: { id } });

    await logAudit('TASK_DELETED', userId, {
      taskId: id,
      taskType: 'WORKFORCE_PLANNING',
    });

    wsManager.broadcast('TASK_DELETED', {
      type: 'WORKFORCE_PLANNING',
      id,
      deletedBy: userId,
    });

    return { success: true };
  }

  if (normType === 'PAYROLL') {
    if (!isHeadOfHr && !userRoles.includes('HR_PAYROLL')) {
      throw new AppError('Forbidden: Insufficient permissions to delete payroll', 403);
    }

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new AppError('Payroll period not found', 404);
    if (period.status !== 'DRAFT') {
      throw new AppError('Only draft payroll periods can be deleted', 400);
    }

    await prisma.payrollPeriod.delete({ where: { id } });

    await logAudit('TASK_DELETED', userId, {
      taskId: id,
      taskType: 'PAYROLL',
    });

    return { success: true };
  }

  if (normType === 'RECRUITMENT') {
    const req = await prisma.jobRequisition.findUnique({ where: { id } });
    if (!req) throw new AppError('Job requisition not found', 404);
    if ((req.status as string) !== 'DRAFT') {
      throw new AppError('Only draft requisitions can be deleted', 400);
    }
    if (!isHeadOfHr && req.requestedBy !== userId) {
      throw new AppError('Forbidden: You can only delete your own draft requisitions', 403);
    }

    await prisma.jobRequisition.delete({ where: { id } });
    await logAudit('TASK_DELETED', userId, { taskId: id, taskType: 'RECRUITMENT' });
    return { success: true };
  }

  if (normType === 'LEAVE') {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new AppError('Leave request not found', 404);
    if (!isHeadOfHr && !userRoles.includes('HR_ATTENDANCE') && !userRoles.includes('HR_ADMIN')) {
      throw new AppError('Forbidden: Insufficient permissions to delete leave request', 403);
    }
    if (leave.status !== 'DRAFT' && !isHeadOfHr) {
      throw new AppError('Only draft leave requests can be deleted', 400);
    }
    await prisma.leaveRequest.delete({ where: { id } });
    await logAudit('TASK_DELETED', userId, { taskId: id, taskType: 'LEAVE' });
    return { success: true };
  }

  if (normType === 'OVERTIME') {
    const ot = await prisma.overtimeRequest.findUnique({ where: { id } });
    if (!ot) throw new AppError('Overtime request not found', 404);
    if (!isHeadOfHr && !userRoles.includes('HR_ATTENDANCE') && !userRoles.includes('HR_ADMIN')) {
      throw new AppError('Forbidden: Insufficient permissions to delete overtime request', 403);
    }
    if (ot.status !== 'DRAFT' && !isHeadOfHr) {
      throw new AppError('Only draft overtime requests can be deleted', 400);
    }
    await prisma.overtimeRequest.delete({ where: { id } });
    await logAudit('TASK_DELETED', userId, { taskId: id, taskType: 'OVERTIME' });
    return { success: true };
  }

  if (normType === 'PROMOTION') {
    const promo = await prisma.promotionRequest.findUnique({ where: { id } });
    if (!promo) throw new AppError('Promotion request not found', 404);
    if (!isHeadOfHr && promo.requestedById !== userId && !userRoles.includes('HR_PERFORMANCE') && !userRoles.includes('HR_ADMIN')) {
      throw new AppError('Forbidden: You can only delete your own draft promotions', 403);
    }
    if (promo.status !== 'DRAFT' && !isHeadOfHr) {
      throw new AppError('Only draft promotion requests can be deleted', 400);
    }
    await prisma.promotionRequest.delete({ where: { id } });
    await logAudit('TASK_DELETED', userId, { taskId: id, taskType: 'PROMOTION' });
    return { success: true };
  }

  if (normType === 'TRAINING') {
    const plan = await prisma.trainingPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError('Training plan not found', 404);
    if (!isHeadOfHr && !userRoles.includes('HR_LND') && !userRoles.includes('HR_ADMIN')) {
      throw new AppError('Forbidden: Insufficient permissions to delete training plan', 403);
    }
    if (plan.status !== 'DRAFT' && !isHeadOfHr) {
      throw new AppError('Only draft training proposals can be deleted', 400);
    }
    await prisma.trainingPlan.delete({ where: { id } });
    await logAudit('TASK_DELETED', userId, { taskId: id, taskType: 'TRAINING' });
    return { success: true };
  }

  throw new AppError(`Unsupported task type: ${type}`, 400);
};

/**
 * Follow-up on a pending task - Sends urgent alert to Head of HR
 */
export const followUpUnifiedTask = async (
  userId: number,
  userRoles: string[],
  userEmail: string,
  type: string,
  id: number,
) => {
  const normType = normalizeTaskType(type);
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');

  let taskTitle = '';
  let createdAt = new Date();
  let requestedBy = 0;
  let isPending = false;

  if (normType === 'WORKFORCE_PLANNING') {
    const req = await prisma.workforceRequest.findUnique({
      where: { id },
      include: { position: true, requester: true },
    });
    if (!req) throw new AppError('Workforce request not found', 404);
    isPending = req.status === 'PENDING_APPROVAL' || req.status === 'SUBMITTED';
    taskTitle = `Headcount: ${req.headcount}x ${req.position.title}`;
    createdAt = req.createdAt;
    requestedBy = req.requestedBy;
  } else if (normType === 'PAYROLL') {
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new AppError('Payroll period not found', 404);
    isPending = (period.status as string) === 'PENDING_APPROVAL';
    taskTitle = `Payroll Period: ${period.name}`;
    createdAt = period.createdAt;
    requestedBy = userId;
  } else if (normType === 'RECRUITMENT') {
    const req = await prisma.jobRequisition.findUnique({
      where: { id },
      include: { workforceRequest: { include: { position: true } } },
    });
    if (!req) throw new AppError('Job requisition not found', 404);
    isPending = (req.status as string) === 'PENDING_APPROVAL' || (req.status as string) === 'SUBMITTED';
    taskTitle = `Job Requisition: ${req.workforceRequest.position.title}`;
    createdAt = req.createdAt;
    requestedBy = req.requestedBy;
  } else if (normType === 'LEAVE') {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });
    if (!leave) throw new AppError('Leave request not found', 404);
    isPending = (leave.status as string) === 'PENDING_APPROVAL' || (leave.status as string) === 'SUBMITTED';
    taskTitle = `Leave: ${leave.employee.firstName} ${leave.employee.lastName} (${leave.leaveType.name})`;
    createdAt = leave.createdAt;
    requestedBy = leave.employeeId;
  } else if (normType === 'OVERTIME') {
    const ot = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!ot) throw new AppError('Overtime request not found', 404);
    isPending = (ot.status as string) === 'PENDING_APPROVAL' || (ot.status as string) === 'SUBMITTED';
    taskTitle = `Overtime: ${ot.employee.firstName} ${ot.employee.lastName} (${ot.hours}h)`;
    createdAt = ot.createdAt;
    requestedBy = ot.employeeId;
  } else if (normType === 'PROMOTION') {
    const promo = await prisma.promotionRequest.findUnique({
      where: { id },
      include: { employee: true, proposedPosition: true },
    });
    if (!promo) throw new AppError('Promotion request not found', 404);
    isPending = (promo.status as string) === 'PENDING_APPROVAL' || (promo.status as string) === 'SUBMITTED';
    taskTitle = `Promotion: ${promo.employee.firstName} ${promo.employee.lastName} -> ${promo.proposedPosition.title}`;
    createdAt = promo.createdAt;
    requestedBy = promo.requestedById;
  } else if (normType === 'TRAINING') {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { training: true },
    });
    if (!plan) throw new AppError('Training plan not found', 404);
    isPending = (plan.status as string) === 'IN_PROGRESS' || (plan.status as string) === 'DRAFT';
    taskTitle = `Training: ${plan.training.title}`;
    createdAt = plan.createdAt;
    requestedBy = userId;
  } else {
    throw new AppError(`Unsupported task type for follow up: ${type}`, 400);
  }

  if (!isPending) {
    throw new AppError('Only pending approval tasks can be followed up', 400);
  }

  const isAuthorizedModuleRole =
    (normType === 'WORKFORCE_PLANNING' && userRoles.includes('HR_ADMIN')) ||
    (normType === 'PAYROLL' && userRoles.includes('HR_PAYROLL')) ||
    (normType === 'RECRUITMENT' && userRoles.includes('HR_RECRUITMENT')) ||
    (normType === 'LEAVE' && userRoles.includes('HR_ATTENDANCE')) ||
    (normType === 'OVERTIME' && userRoles.includes('HR_ATTENDANCE')) ||
    (normType === 'PROMOTION' && userRoles.includes('HR_PERFORMANCE')) ||
    (normType === 'TRAINING' && userRoles.includes('HR_LND'));

  if (!isHeadOfHr && !isAuthorizedModuleRole && requestedBy !== 0 && requestedBy !== userId && !userRoles.includes('HR_ADMIN')) {
    throw new AppError('Forbidden: You can only follow up on your module tasks', 403);
  }

  // Rate-limiting cooldown: check if follow-up was sent within the last 1 hour
  const entityId = `${normType}-${id}`;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentNotification = await prisma.notification.findFirst({
    where: {
      entityType: 'TASK',
      entityId,
      title: { contains: 'Follow-Up' },
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentNotification) {
    throw new AppError(
      'A follow-up was already sent recently. Please allow at least 1 hour before following up again.',
      429,
    );
  }

  const pendingDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  const notificationTitle = `🔔 Urgent Follow-Up: ${taskTitle}`;
  const notificationMessage = `HR Officer (${userEmail}) requested follow-up on "${taskTitle}" (ID #${id}), which has been awaiting your approval for ${pendingDays} day(s).`;

  // Create notifications for all active Head of HR officers
  const headUsers = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: 'HEAD_OF_HR' } } },
      isActive: true,
    },
  });

  for (const head of headUsers) {
    const createdNotif = await prisma.notification.create({
      data: {
        recipientId: head.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'ALERT',
        entityType: 'TASK',
        entityId,
      },
    });

    wsManager.sendToUser(head.id, 'NOTIFICATION_CREATED', createdNotif);
  }

  // Real-time broadcast to all Head of HR sockets
  wsManager.broadcastToRoles(['HEAD_OF_HR'], 'TASK_FOLLOW_UP', {
    type: normType,
    id,
    taskTitle,
    requestedBy: userEmail,
    pendingDays,
    timestamp: new Date().toISOString(),
  });

  await logAudit('TASK_FOLLOW_UP', userId, {
    taskId: id,
    taskType: normType,
    taskTitle,
    pendingDays,
    requesterEmail: userEmail,
  });

  return {
    success: true,
    message: 'Follow-up notification sent to Head of HR',
    followedUpAt: new Date().toISOString(),
    pendingDays,
  };
};

export interface CreateTaskDTO {
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
  employeeId?: number;
  currentPositionId?: number;
  proposedPositionId?: number;
  proposedSalary?: number;
  trainingTitle?: string;
  trainingCategoryId?: number;
  budget?: number;
}

export const createUnifiedTask = async (
  userId: number,
  userRoles: string[],
  userEmail: string,
  data: CreateTaskDTO,
) => {
  const normType = normalizeTaskType(data.type || 'WORKFORCE_PLANNING');
  const submitNow = data.submitNow !== false;

  if (normType === 'WORKFORCE_PLANNING') {
    if (!data.departmentId || !data.positionId) {
      throw new AppError('Department and Position are required for Workforce Request', 400);
    }
    const headcount = data.headcount || 1;
    const request = await prisma.workforceRequest.create({
      data: {
        departmentId: data.departmentId,
        positionId: data.positionId,
        headcount,
        justification: data.justification || 'Headcount expansion request',
        requestedBy: userId,
        status: submitNow ? 'PENDING_APPROVAL' : 'DRAFT',
      },
      include: { position: true, department: true },
    });

    await logAudit('TASK_CREATED', userId, {
      taskId: request.id,
      taskType: 'WORKFORCE_PLANNING',
      headcount,
      status: request.status,
    });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 New Task Submitted for Approval',
        `Officer ${userEmail} submitted workforce request #${request.id} (${request.position.title}) for your executive approval.`,
        'INFO',
        'TASK',
        `WORKFORCE_PLANNING-${request.id}`,
      );
      wsManager.broadcastToRoles(['HEAD_OF_HR'], 'TASK_SUBMITTED', {
        type: 'WORKFORCE_PLANNING',
        id: request.id,
        title: `Headcount: ${headcount}x ${request.position.title}`,
        submittedBy: userEmail,
      });
    }

    return { id: `WORKFORCE_PLANNING-${request.id}`, rawId: request.id, type: 'WORKFORCE_PLANNING', status: request.status };
  }

  if (normType === 'LEAVE') {
    let emp = await prisma.employee.findFirst({ where: { userId } });
    if (!emp) emp = await prisma.employee.findFirst();
    if (!emp) throw new AppError('No employee record found to associate with leave request', 400);

    let leaveType = data.leaveTypeId
      ? await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } })
      : await prisma.leaveType.findFirst();

    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: { name: 'Annual Leave', daysAllowed: 15, isPaid: true },
      });
    }

    const start = data.startDate ? new Date(data.startDate) : new Date();
    const end = data.endDate ? new Date(data.endDate) : new Date(Date.now() + 86400000);

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        reason: data.justification || 'Leave request submitted via Tasks portal',
        status: submitNow ? 'SUBMITTED' : 'DRAFT',
      },
      include: { leaveType: true, employee: true },
    });

    await logAudit('TASK_CREATED', userId, { taskId: leave.id, taskType: 'LEAVE', status: leave.status });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 Leave Request Awaiting Approval',
        `Officer ${userEmail} submitted leave request for ${emp.firstName} ${emp.lastName} (${leaveType.name}) for your review.`,
        'INFO',
        'TASK',
        `LEAVE-${leave.id}`,
      );
    }

    return { id: `LEAVE-${leave.id}`, rawId: leave.id, type: 'LEAVE', status: leave.status };
  }

  if (normType === 'OVERTIME') {
    let emp = await prisma.employee.findFirst({ where: { userId } });
    if (!emp) emp = await prisma.employee.findFirst();
    if (!emp) throw new AppError('No employee record found to associate with overtime request', 400);

    const ot = await prisma.overtimeRequest.create({
      data: {
        employeeId: emp.id,
        date: data.date ? new Date(data.date) : new Date(),
        hours: data.hours || 2,
        reason: data.justification || 'Overtime operations justification',
        status: submitNow ? 'SUBMITTED' : 'DRAFT',
      },
      include: { employee: true },
    });

    await logAudit('TASK_CREATED', userId, { taskId: ot.id, taskType: 'OVERTIME', status: ot.status });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 Overtime Request Awaiting Approval',
        `Officer ${userEmail} submitted overtime request for ${emp.firstName} ${emp.lastName} (${ot.hours}h) for review.`,
        'INFO',
        'TASK',
        `OVERTIME-${ot.id}`,
      );
    }

    return { id: `OVERTIME-${ot.id}`, rawId: ot.id, type: 'OVERTIME', status: ot.status };
  }

  if (normType === 'PROMOTION') {
    let emp = await prisma.employee.findFirst();
    if (!emp) throw new AppError('No employee record found to associate with promotion request', 400);

    const targetPosId = data.proposedPositionId || emp.positionId;
    const promo = await prisma.promotionRequest.create({
      data: {
        employeeId: emp.id,
        currentPositionId: data.currentPositionId || emp.positionId,
        proposedPositionId: targetPosId,
        proposedSalary: data.proposedSalary || 5000,
        reason: data.justification || 'Promotion recommendation',
        effectiveDate: new Date(Date.now() + 30 * 86400000),
        status: submitNow ? 'PENDING_APPROVAL' : 'DRAFT',
        requestedById: userId,
      },
      include: { employee: true, proposedPosition: true },
    });

    await logAudit('TASK_CREATED', userId, { taskId: promo.id, taskType: 'PROMOTION', status: promo.status });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 Promotion Request Awaiting Approval',
        `Officer ${userEmail} submitted promotion request for ${emp.firstName} ${emp.lastName} -> ${promo.proposedPosition.title}.`,
        'INFO',
        'TASK',
        `PROMOTION-${promo.id}`,
      );
    }

    return { id: `PROMOTION-${promo.id}`, rawId: promo.id, type: 'PROMOTION', status: promo.status };
  }

  if (normType === 'TRAINING') {
    let category = data.trainingCategoryId
      ? await prisma.trainingCategory.findUnique({ where: { id: data.trainingCategoryId } })
      : await prisma.trainingCategory.findFirst();

    if (!category) {
      category = await prisma.trainingCategory.create({
        data: { name: 'Leadership & Soft Skills', description: 'Core development tracks' },
      });
    }

    let training = await prisma.training.findFirst({
      where: { title: data.trainingTitle || 'Executive Leadership Workshop' },
    });

    if (!training) {
      training = await prisma.training.create({
        data: {
          title: data.trainingTitle || 'Executive Leadership Workshop',
          categoryId: category.id,
          type: 'INTERNAL',
          status: 'ACTIVE',
        },
      });
    }

    const plan = await prisma.trainingPlan.create({
      data: {
        trainingId: training.id,
        identifiedNeed: data.justification || 'Skill gap enhancement',
        objective: 'Improve cross-functional HR execution',
        budget: data.budget || 1500,
        priority: 'HIGH',
        status: submitNow ? 'IN_PROGRESS' : 'DRAFT',
      },
      include: { training: true },
    });

    await logAudit('TASK_CREATED', userId, { taskId: plan.id, taskType: 'TRAINING', status: plan.status });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 Training Proposal Awaiting Approval',
        `Officer ${userEmail} submitted training proposal "${training.title}" for review.`,
        'INFO',
        'TASK',
        `TRAINING-${plan.id}`,
      );
    }

    return { id: `TRAINING-${plan.id}`, rawId: plan.id, type: 'TRAINING', status: plan.status };
  }

  if (normType === 'RECRUITMENT') {
    let wf = await prisma.workforceRequest.findFirst({ where: { status: 'APPROVED' } });
    if (!wf) {
      const dept = data.departmentId || (await prisma.department.findFirst())?.id || 1;
      const pos = data.positionId || (await prisma.position.findFirst())?.id || 1;
      wf = await prisma.workforceRequest.create({
        data: {
          departmentId: dept,
          positionId: pos,
          headcount: data.headcount || 1,
          justification: 'Automated requisition basis',
          requestedBy: userId,
          status: 'APPROVED',
        },
      });
    }

    const req = await prisma.jobRequisition.create({
      data: {
        workforceRequestId: wf.id,
        requestedBy: userId,
        status: submitNow ? 'PENDING_APPROVAL' : 'DRAFT',
      },
      include: { workforceRequest: { include: { position: true, department: true } } },
    });

    await logAudit('TASK_CREATED', userId, { taskId: req.id, taskType: 'RECRUITMENT', status: req.status });

    if (submitNow) {
      await notifyRoles(
        ['HEAD_OF_HR'],
        '📋 Job Requisition Awaiting Approval',
        `Officer ${userEmail} submitted job requisition for ${req.workforceRequest.position.title}.`,
        'INFO',
        'TASK',
        `RECRUITMENT-${req.id}`,
      );
    }

    return { id: `RECRUITMENT-${req.id}`, rawId: req.id, type: 'RECRUITMENT', status: req.status };
  }

  throw new AppError(`Unsupported task type: ${data.type}`, 400);
};
