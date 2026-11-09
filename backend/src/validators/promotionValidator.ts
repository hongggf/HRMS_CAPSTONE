import { z } from 'zod';

const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

export const createPromotionSchema = z.object({
  employeeId: z.number().positive('Employee ID is required'),
  proposedPositionId: z.number().positive('Proposed position ID is required'),
  proposedSalary: z.number().positive('Proposed salary must be greater than 0').optional(),
  reason: z.string().min(1, 'Reason is required'),
  performanceReviewId: z.number().positive().optional(),
  effectiveDate: dateStringSchema,
});

export const createPipSchema = z.object({
  employeeId: z.number().positive('Employee ID is required'),
  reason: z.string().min(1, 'Reason is required'),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  objective: z.string().min(1, 'Objective is required'),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const addPipItemSchema = z.object({
  action: z.string().min(1, 'Action description is required'),
  target: z.string().min(1, 'Target metric is required'),
  owner: z.string().min(1, 'Owner is required'),
  dueDate: dateStringSchema,
});

export const updatePipProgressSchema = z.object({
  progress: z.number().min(0, 'Progress must be at least 0').max(100, 'Progress cannot exceed 100'),
  completionDate: dateStringSchema.optional().nullable(),
});
