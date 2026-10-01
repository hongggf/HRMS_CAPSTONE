import { z } from 'zod';

// ========== Workforce Request Validators ==========

export const createWorkforceRequestSchema = z.object({
  body: z.object({
    departmentId: z.number().int().positive('Department ID must be a positive integer'),
    positionId: z.number().int().positive('Position ID must be a positive integer'),
    headcount: z.number().int().positive('Headcount must be a positive integer'),
    justification: z.string().min(1, 'Justification is required').max(1000),
  }),
});

export const updateWorkforceRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
  body: z.object({
    departmentId: z.number().int().positive().optional(),
    positionId: z.number().int().positive().optional(),
    headcount: z.number().int().positive('Headcount must be a positive integer').optional(),
    justification: z.string().min(1).max(1000).optional(),
  }),
});

export const workforceRequestIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const submitWorkforceRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const approveWorkforceRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const rejectWorkforceRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
  body: z.object({
    rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
  }),
});

export const cancelWorkforceRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const listWorkforceRequestsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
    departmentId: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
