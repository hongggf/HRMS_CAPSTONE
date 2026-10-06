import { z } from 'zod';

export const createPromotionSchema = z.object({
  employeeId: z.number().positive(),
  proposedPositionId: z.number().positive(),
  proposedSalary: z.number().positive().optional(),
  reason: z.string().min(1),
  performanceReviewId: z.number().positive().optional(),
  effectiveDate: z.string().datetime()
});

export const createPipSchema = z.object({
  employeeId: z.number().positive(),
  reason: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  objective: z.string().min(1)
});

export const addPipItemSchema = z.object({
  action: z.string().min(1),
  target: z.string().min(1),
  owner: z.string().min(1),
  dueDate: z.string().datetime()
});

export const updatePipProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  completionDate: z.string().datetime().optional()
});
