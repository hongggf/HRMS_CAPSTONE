import { z } from 'zod';

const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

export const createCycleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const createGoalSchema = z.object({
  cycleId: z.number().positive('Cycle ID is required'),
  employeeId: z.number().positive('Employee ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  weight: z.number().min(0, 'Weight must be at least 0').max(100, 'Weight cannot exceed 100'),
  target: z.string().optional(),
  measurement: z.string().optional(),
  dueDate: dateStringSchema,
});

export const createReviewSchema = z.object({
  cycleId: z.number().positive('Cycle ID is required'),
  employeeId: z.number().positive('Employee ID is required'),
  reviewerId: z.number().positive().optional(),
});

export const submitReviewSchema = z.object({
  ratings: z.array(z.object({
    goalId: z.number().positive('Goal ID must be a positive number'),
    rating: z.number().min(0, 'Rating cannot be less than 0').max(5, 'Rating cannot exceed 5'),
    comment: z.string().optional(),
  })).min(1, 'At least one rating is required'),
  comments: z.string().optional(),
  employeeFeedback: z.string().optional(),
  managerFeedback: z.string().optional(),
});
