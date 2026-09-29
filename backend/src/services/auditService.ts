import { prisma } from '../config/db';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logAudit = async (action: string, userId: number | null, details?: any) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    logger.error('Failed to log audit event', error);
  }
};
