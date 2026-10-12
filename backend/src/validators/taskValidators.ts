import { z } from 'zod';

export const listTasksQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    status: z.string().optional(),
    type: z.string().optional(),
    priority: z.string().optional(),
    departmentId: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    year: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    onlyMyTasks: z.string().optional().transform((val) => val === 'true'),
  }),
});

export const taskParamsSchema = z.object({
  params: z.object({
    type: z.string().min(1, 'Task type is required'),
    id: z.string().regex(/^\d+$/, 'Task ID must be an integer').transform(Number),
  }),
});

export const rejectTaskSchema = z.object({
  params: z.object({
    type: z.string().min(1, 'Task type is required'),
    id: z.string().regex(/^\d+$/, 'Task ID must be an integer').transform(Number),
  }),
  body: z.object({
    rejectionReason: z
      .string()
      .min(1, 'Rejection reason is required')
      .max(1000, 'Rejection reason cannot exceed 1000 characters'),
  }),
});
