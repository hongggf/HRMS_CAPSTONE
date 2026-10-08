import { Request, Response } from 'express';
import { prisma } from '../config/db';



export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', actorId, module, action, entityId, startDate, endDate } = req.query;
    
    const take = parseInt(limit as string);
    const skip = (parseInt(page as string) - 1) * take;
    
    const where: any = {};
    if (actorId) where.actorId = parseInt(actorId as string);
    if (module) where.module = module;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }
    
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { email: true } } }
      })
    ]);
    
    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: parseInt(page as string),
        limit: take
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
