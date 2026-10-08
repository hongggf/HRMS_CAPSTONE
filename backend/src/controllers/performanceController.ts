import { Request, Response } from 'express';
import { ReviewStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createCycleSchema, createGoalSchema, createReviewSchema, submitReviewSchema } from '../validators/performanceValidator';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';



// Cycle Management
export const createCycle = async (req: Request, res: Response) => {
  try {
    const data = createCycleSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const cycle = await prisma.performanceCycle.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'DRAFT'
      }
    });

    await logAudit('PERFORMANCE_CYCLE_CREATED', userId, { cycleId: cycle.id });
    res.status(201).json(cycle);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Goal Management
export const createGoal = async (req: Request, res: Response) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const goal = await prisma.goal.create({
      data: {
        cycleId: data.cycleId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description,
        weight: data.weight,
        target: data.target,
        measurement: data.measurement,
        dueDate: new Date(data.dueDate),
        status: 'DRAFT'
      }
    });

    await logAudit('PERFORMANCE_GOAL_CREATED', userId, { goalId: goal.id });
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// KPI Assignment
export const assignKPI = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { kpiId, targetValue } = req.body;
    const userId = (req as any).user!.id;

    const assignment = await prisma.employeeGoal.create({
      data: {
        goalId: parseInt(goalId),
        kpiId: parseInt(kpiId),
        targetValue
      }
    });

    await logAudit('PERFORMANCE_KPI_ASSIGNED', userId, { goalId, kpiId });
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Review Management
export const createReview = async (req: Request, res: Response) => {
  try {
    const data = createReviewSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const review = await prisma.performanceReview.create({
      data: {
        cycleId: data.cycleId,
        employeeId: data.employeeId,
        reviewerId: data.reviewerId,
        status: 'DRAFT'
      }
    });

    await logAudit('PERFORMANCE_REVIEW_CREATED', userId, { reviewId: review.id });
    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const evaluateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = submitReviewSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const review = await prisma.performanceReview.findUnique({ where: { id: parseInt(id) } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.status === 'FINALIZED') return res.status(400).json({ error: 'Cannot modify finalized review' });

    const result = await prisma.$transaction(async (tx) => {
      // Create ratings
      await tx.performanceRating.deleteMany({ where: { reviewId: review.id } });
      await tx.performanceRating.createMany({
        data: data.ratings.map(r => ({
          reviewId: review.id,
          goalId: r.goalId,
          rating: r.rating,
          comment: r.comment
        }))
      });

      // Calculate weighted score
      const goals = await tx.goal.findMany({ where: { employeeId: review.employeeId, cycleId: review.cycleId } });
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const r of data.ratings) {
        const goal = goals.find(g => g.id === r.goalId);
        if (goal) {
          totalWeightedScore += (r.rating * goal.weight);
          totalWeight += goal.weight;
        }
      }

      const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

      const updated = await tx.performanceReview.update({
        where: { id: review.id },
        data: {
          overallScore,
          comments: data.comments,
          employeeFeedback: data.employeeFeedback,
          managerFeedback: data.managerFeedback,
          status: 'SUBMITTED'
        }
      });
      return updated;
    });

    await logAudit('PERFORMANCE_REVIEW_EVALUATED', userId, { reviewId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approveReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const review = await prisma.performanceReview.findUnique({ where: { id: parseInt(id) } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.status === 'FINALIZED') return res.status(400).json({ error: 'Already finalized' });

    const updated = await prisma.performanceReview.update({
      where: { id: parseInt(id) },
      data: { status: 'HEAD_OF_HR_REVIEW' }
    });

    await logAudit('PERFORMANCE_REVIEW_APPROVED', userId, { reviewId: id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const finalizeReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const review = await prisma.performanceReview.findUnique({ where: { id: parseInt(id) } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.status === 'FINALIZED') return res.status(400).json({ error: 'Already finalized' });

    const updated = await prisma.performanceReview.update({
      where: { id: parseInt(id) },
      data: { status: 'FINALIZED' }
    });

    await logAudit('PERFORMANCE_REVIEW_FINALIZED', userId, { reviewId: id });
    const uEmp = await prisma.employee.findUnique({ where: { id: review.employeeId } });
    if (uEmp?.userId) await notifyUser(uEmp.userId, 'Performance Review Finalized', `Your performance review has been finalized.`, 'INFO', 'PerformanceReview', String(id));
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
