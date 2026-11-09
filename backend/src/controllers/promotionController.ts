import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { createPromotionSchema, createPipSchema, addPipItemSchema, updatePipProgressSchema } from '../validators/promotionValidator';
import { logAudit } from '../services/auditService';

// ======================= PROMOTIONS =======================

export const getPromotions = async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    const where: any = {};
    if (employeeId) where.employeeId = parseInt(employeeId as string, 10);
    if (status) where.status = status as any;

    const promotions = await prisma.promotionRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
        currentPosition: true,
        proposedPosition: true,
        requestedBy: {
          select: {
            id: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
          },
        },
        performanceReview: {
          select: {
            id: true,
            overallScore: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(promotions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const requestPromotion = async (req: Request, res: Response) => {
  try {
    const data = createPromotionSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { compensation: true },
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const promotion = await prisma.promotionRequest.create({
      data: {
        employeeId: data.employeeId,
        currentPositionId: employee.positionId,
        proposedPositionId: data.proposedPositionId,
        currentSalary: employee.compensation?.basicSalary,
        proposedSalary: data.proposedSalary,
        reason: data.reason,
        performanceReviewId: data.performanceReviewId,
        effectiveDate: new Date(data.effectiveDate),
        status: 'SUBMITTED',
        requestedById: userId,
      },
      include: {
        employee: true,
        currentPosition: true,
        proposedPosition: true,
      },
    });

    await logAudit('PROMOTION_REQUESTED', userId, { promotionId: promotion.id });
    res.status(201).json(promotion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approvePromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const promotion = await prisma.promotionRequest.findUnique({
      where: { id: parseInt(id, 10) },
      include: { employee: true },
    });

    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (promotion.status === 'APPROVED' || promotion.status === 'REJECTED') {
      return res.status(400).json({ error: 'Already processed' });
    }

    const proposedPos = await prisma.position.findUnique({ where: { id: promotion.proposedPositionId } });
    if (!proposedPos) return res.status(404).json({ error: 'Proposed position missing' });

    // Transaction for approval logic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update promotion request
      const updatedPromo = await tx.promotionRequest.update({
        where: { id: promotion.id },
        data: { status: 'APPROVED', approvedById: userId },
      });

      // 2. End current position history
      const currentPos = await tx.employeePositionHistory.findFirst({
        where: { employeeId: promotion.employeeId, endDate: null },
        orderBy: { startDate: 'desc' },
      });
      if (currentPos) {
        await tx.employeePositionHistory.update({
          where: { id: currentPos.id },
          data: { endDate: new Date() },
        });
      }

      // Create new position history
      await tx.employeePositionHistory.create({
        data: {
          employeeId: promotion.employeeId,
          positionId: promotion.proposedPositionId,
          departmentId: proposedPos.departmentId,
          startDate: new Date(),
          changedById: userId,
          notes: 'PROMOTION',
        },
      });

      // 3. Update employee position
      await tx.employee.update({
        where: { id: promotion.employeeId },
        data: {
          positionId: promotion.proposedPositionId,
          departmentId: proposedPos.departmentId,
        },
      });

      // 4. Update salary if provided
      if (promotion.proposedSalary) {
        const currentSal = await tx.employeeSalaryHistory.findFirst({
          where: { employeeId: promotion.employeeId, endDate: null },
          orderBy: { effectiveDate: 'desc' },
        });
        if (currentSal) {
          await tx.employeeSalaryHistory.update({
            where: { id: currentSal.id },
            data: { endDate: new Date() },
          });
        }
        await tx.employeeSalaryHistory.create({
          data: {
            employeeId: promotion.employeeId,
            baseSalary: promotion.proposedSalary,
            effectiveDate: new Date(),
            changedById: userId,
            changeReason: 'PROMOTION',
          },
        });
        await tx.employeeCompensation.upsert({
          where: { employeeId: promotion.employeeId },
          update: { basicSalary: promotion.proposedSalary },
          create: {
            employeeId: promotion.employeeId,
            basicSalary: promotion.proposedSalary,
            effectiveDate: new Date(),
          },
        });
      }

      return updatedPromo;
    });

    await logAudit('PROMOTION_APPROVED', userId, { promotionId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectPromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const promotion = await prisma.promotionRequest.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (promotion.status === 'APPROVED' || promotion.status === 'REJECTED') {
      return res.status(400).json({ error: 'Already processed' });
    }

    const updated = await prisma.promotionRequest.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'REJECTED' },
    });

    await logAudit('PROMOTION_REJECTED', userId, { promotionId: id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ======================= PIP =======================

export const getPips = async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    const where: any = {};
    if (employeeId) where.employeeId = parseInt(employeeId as string, 10);
    if (status) where.status = status as any;

    const pips = await prisma.improvementPlan.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
        items: {
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pips);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pip = await prisma.improvementPlan.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
        items: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!pip) return res.status(404).json({ error: 'PIP not found' });
    res.json(pip);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPip = async (req: Request, res: Response) => {
  try {
    const data = createPipSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const pip = await prisma.improvementPlan.create({
      data: {
        employeeId: data.employeeId,
        reason: data.reason,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        objective: data.objective,
        status: 'ACTIVE',
      },
      include: {
        employee: true,
        items: true,
      },
    });

    await logAudit('PIP_CREATED', userId, { pipId: pip.id });
    res.status(201).json(pip);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const addPipItem = async (req: Request, res: Response) => {
  try {
    const { pipId } = req.params;
    const data = addPipItemSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const pip = await prisma.improvementPlan.findUnique({ where: { id: parseInt(pipId, 10) } });
    if (!pip) return res.status(404).json({ error: 'PIP not found' });

    const item = await prisma.improvementPlanItem.create({
      data: {
        planId: parseInt(pipId, 10),
        action: data.action,
        target: data.target,
        owner: data.owner,
        dueDate: new Date(data.dueDate),
        progress: 0,
      },
    });

    await logAudit('PIP_ITEM_ADDED', userId, { pipId, itemId: item.id });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updatePipProgress = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const data = updatePipProgressSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const existingItem = await prisma.improvementPlanItem.findUnique({ where: { id: parseInt(itemId, 10) } });
    if (!existingItem) return res.status(404).json({ error: 'PIP item not found' });

    const completionDate = data.completionDate
      ? new Date(data.completionDate)
      : data.progress === 100 && !existingItem.completionDate
      ? new Date()
      : data.progress < 100
      ? null
      : existingItem.completionDate;

    const item = await prisma.improvementPlanItem.update({
      where: { id: parseInt(itemId, 10) },
      data: {
        progress: data.progress,
        completionDate,
      },
    });

    await logAudit('PIP_PROGRESS_UPDATED', userId, { itemId });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
