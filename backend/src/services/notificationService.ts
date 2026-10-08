import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export const notifyUser = async (recipientId: number, title: string, message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT' = 'INFO', entityType?: string, entityId?: string) => {
  try {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: recipientId } });
    if (pref && !pref.inApp) {
      return; // user disabled in-app notifications
    }
    
    await prisma.notification.create({
      data: {
        recipientId,
        title,
        message,
        type,
        entityType,
        entityId
      }
    });
  } catch (error) {
    logger.error('Failed to create notification', error);
  }
};
