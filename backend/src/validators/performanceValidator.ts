import { z } from 'zod';

export const createCycleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const createGoalSchema = z.object({
  cycleId: z.number().positive(),
  employeeId: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().min(0).max(100),
  target: z.string().optional(),
  measurement: z.string().optional(),
  dueDate: z.string().datetime(),
});

export const createReviewSchema = z.object({
  cycleId: z.number().positive(),
  employeeId: z.number().positive(),
  reviewerId: z.number().positive().optional(),
});

export const submitReviewSchema = z.object({
  ratings: z.array(z.object({
    goalId: z.number().positive(),
    rating: z.number().min(0).max(5),
    comment: z.string().optional()
  })),
  comments: z.string().optional(),
  employeeFeedback: z.string().optional(),
  managerFeedback: z.string().optional()
});
