import { z } from 'zod';

// ========== Department Validators ==========

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1, 'Code is required').max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
    description: z.string().max(500).optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores').optional(),
    description: z.string().max(500).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const departmentIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const listDepartmentsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});
