import { z } from 'zod';

// ========== Position Validators ==========

export const createPositionSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100),
    code: z.string().min(1, 'Code is required').max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
    departmentId: z.number().int().positive('Department ID must be a positive integer'),
    description: z.string().max(500).optional(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
    salaryMin: z.number().nonnegative('Salary minimum cannot be negative').optional(),
    salaryMax: z.number().nonnegative('Salary maximum cannot be negative').optional(),
  }).refine(data => {
    if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  }, { message: 'Salary maximum must be greater than or equal to salary minimum', path: ['salaryMax'] }),
});

export const updatePositionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores').optional(),
    departmentId: z.number().int().positive().optional(),
    description: z.string().max(500).optional().nullable(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
    salaryMin: z.number().nonnegative('Salary minimum cannot be negative').optional().nullable(),
    salaryMax: z.number().nonnegative('Salary maximum cannot be negative').optional().nullable(),
    status: z.enum(['OPEN', 'CLOSED', 'FROZEN']).optional(),
  }).refine(data => {
    if (data.salaryMin !== undefined && data.salaryMin !== null &&
        data.salaryMax !== undefined && data.salaryMax !== null) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  }, { message: 'Salary maximum must be greater than or equal to salary minimum', path: ['salaryMax'] }),
});

export const positionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const listPositionsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    departmentId: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['OPEN', 'CLOSED', 'FROZEN']).optional(),
  }),
});
