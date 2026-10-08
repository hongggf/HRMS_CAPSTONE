import { Request, Response } from 'express';
import { prisma } from '../config/db';



export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const count = await prisma.notification.count({
      where: { recipientId: userId, isRead: false }
    });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const notification = await prisma.notification.updateMany({
      where: { id: parseInt(id), recipientId: userId },
      data: { isRead: true }
    });
    res.json({ success: true, count: notification.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    
    const notifications = await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, count: notifications.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { email, inApp } = req.body;
    
    const pref = await prisma.notificationPreference.upsert({
      where: { userId },
      update: { email, inApp },
      create: { userId, email, inApp }
    });
    res.json(pref);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
