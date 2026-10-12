import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { wsManager } from '../websocket';

export const notifyUser = async (
  recipientId: number,
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT' = 'INFO',
  entityType?: string,
  entityId?: string,
) => {
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: recipientId },
    });
    if (pref && !pref.inApp) {
      return; // user disabled in-app notifications
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId,
        title,
        message,
        type,
        entityType,
        entityId,
      },
    });

    // Real-time WebSocket dispatch to the recipient
    wsManager.sendToUser(recipientId, 'NOTIFICATION_CREATED', notification);
    wsManager.broadcast('DASHBOARD_UPDATED', {
      type: 'NOTIFICATION',
      recipientId,
    });
  } catch (error) {
    logger.error('Failed to create notification', error);
  }
};

export const notifyRoles = async (
  roles: string[],
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT' = 'INFO',
  entityType?: string,
  entityId?: string,
) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: roles },
            },
          },
        },
        isActive: true,
      },
    });

    for (const user of users) {
      await notifyUser(user.id, title, message, type, entityType, entityId);
    }
  } catch (error) {
    logger.error('Failed to notify roles', error);
  }
};
