import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { createPromotionSchema, createPipSchema, addPipItemSchema, updatePipProgressSchema } from '../validators/promotionValidator';
import { logAudit } from '../services/auditService';


// ======================= PROMOTIONS =======================

export const requestPromotion = async (req: Request, res: Response) => {
  try {
    const data = createPromotionSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { compensation: true }
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
        requestedById: userId
      }
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
      where: { id: parseInt(id) },
      include: { employee: true }
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
        data: { status: 'APPROVED', approvedById: userId }
      });

      // 2. End current position history
      const currentPos = await tx.employeePositionHistory.findFirst({
        where: { employeeId: promotion.employeeId, endDate: null },
        orderBy: { startDate: 'desc' }
      });
      if (currentPos) {
        await tx.employeePositionHistory.update({
          where: { id: currentPos.id },
          data: { endDate: new Date() }
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
          notes: 'PROMOTION'
        }
      });

      // 3. Update employee position
      await tx.employee.update({
        where: { id: promotion.employeeId },
        data: {
          positionId: promotion.proposedPositionId,
          departmentId: proposedPos.departmentId
        }
      });

      // 4. Update salary if provided
      if (promotion.proposedSalary) {
        const currentSal = await tx.employeeSalaryHistory.findFirst({
          where: { employeeId: promotion.employeeId, endDate: null },
          orderBy: { effectiveDate: 'desc' }
        });
        if (currentSal) {
          await tx.employeeSalaryHistory.update({
            where: { id: currentSal.id },
            data: { endDate: new Date() }
          });
        }
        await tx.employeeSalaryHistory.create({
          data: {
            employeeId: promotion.employeeId,
            baseSalary: promotion.proposedSalary,
            effectiveDate: new Date(),
            changedById: userId,
            changeReason: 'PROMOTION'
          }
        });
        await tx.employeeCompensation.upsert({
          where: { employeeId: promotion.employeeId },
          update: { basicSalary: promotion.proposedSalary },
          create: { employeeId: promotion.employeeId, basicSalary: promotion.proposedSalary, effectiveDate: new Date() }
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

    const promotion = await prisma.promotionRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'REJECTED' }
    });

    await logAudit('PROMOTION_REJECTED', userId, { promotionId: id });
    res.json(promotion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ======================= PIP =======================

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
        status: 'ACTIVE'
      }
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

    const item = await prisma.improvementPlanItem.create({
      data: {
        planId: parseInt(pipId),
        action: data.action,
        target: data.target,
        owner: data.owner,
        dueDate: new Date(data.dueDate),
        progress: 0
      }
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

    const item = await prisma.improvementPlanItem.update({
      where: { id: parseInt(itemId) },
      data: {
        progress: data.progress,
        completionDate: data.completionDate ? new Date(data.completionDate) : null
      }
    });

    await logAudit('PIP_PROGRESS_UPDATED', userId, { itemId });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
