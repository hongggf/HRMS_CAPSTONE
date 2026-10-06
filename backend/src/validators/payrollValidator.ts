import { z } from 'zod';

export const createPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED']),
  comments: z.string().optional()
});

export const createAdjustmentSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['ADDITION', 'DEDUCTION']),
  reason: z.string().min(1)
});
