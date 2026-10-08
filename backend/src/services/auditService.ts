import { prisma } from '../config/db';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logAudit = async (action: string, userId: number | null, details?: any) => {
  try {
    let module = 'SYSTEM';
    let entityType = 'UNKNOWN';
    let entityId = null;

    if (action.includes('AUTH') || action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('PASSWORD')) module = 'AUTH';
    else if (action.includes('USER') || action.includes('ROLE')) module = 'USER';
    else if (action.includes('WORKFORCE')) module = 'WORKFORCE';
    else if (action.includes('DEPARTMENT') || action.includes('POSITION')) module = 'ORGANIZATION';
    else if (action.includes('RECRUITMENT') || action.includes('APPLICATION') || action.includes('INTERVIEW')) module = 'RECRUITMENT';
    else if (action.includes('EMPLOYEE') || action.includes('DOCUMENT') || action.includes('ONBOARDING')) module = 'EMPLOYEE';
    else if (action.includes('ATTENDANCE') || action.includes('SHIFT') || action.includes('TIMESHEET')) module = 'ATTENDANCE';
    else if (action.includes('LEAVE')) module = 'LEAVE';
    else if (action.includes('OVERTIME')) module = 'OVERTIME';
    else if (action.includes('PAYROLL')) module = 'PAYROLL';
    else if (action.includes('PERFORMANCE')) module = 'PERFORMANCE';
    else if (action.includes('PROMOTION')) module = 'PROMOTION';
    else if (action.includes('IMPROVEMENT') || action.includes('PIP')) module = 'IMPROVEMENT';
    else if (action.includes('LND') || action.includes('TRAINING') || action.includes('CATEGORY') || action.includes('PLAN') || action.includes('SESSION') || action.includes('EVALUATION') || action.includes('SKILL')) module = 'TRAINING';

    if (details) {
      if (details.employeeId) { entityType = 'Employee'; entityId = String(details.employeeId); }
      else if (details.userId || details.targetUserId || details.newUserId) { entityType = 'User'; entityId = String(details.userId || details.targetUserId || details.newUserId); }
      else if (details.departmentId) { entityType = 'Department'; entityId = String(details.departmentId); }
      else if (details.positionId) { entityType = 'Position'; entityId = String(details.positionId); }
      else if (details.workforceRequestId) { entityType = 'WorkforceRequest'; entityId = String(details.workforceRequestId); }
      else if (details.periodId) { entityType = 'PayrollPeriod'; entityId = String(details.periodId); }
      else if (details.trainingId) { entityType = 'Training'; entityId = String(details.trainingId); }
      else if (details.reviewId) { entityType = 'PerformanceReview'; entityId = String(details.reviewId); }
    }

    await prisma.auditLog.create({
      data: {
        action,
        actorId: userId,
        module,
        entityType,
        entityId,
        newValues: details ? JSON.parse(JSON.stringify(details)) : null,
      },
    });
  } catch (error) {
    logger.error('Failed to log audit event', error);
  }
};
