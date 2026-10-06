import { z } from 'zod';

export const createEmployeeSchema = z.object({
  applicationId: z.number().int().positive(),
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  departmentId: z.number().int().positive(),
  positionId: z.number().int().positive(),
  managerId: z.number().int().positive().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
  hireDate: z.string().datetime().optional(),
  baseSalary: z.number().positive().optional()
});

export const updateEmployeeSchema = z.object({
  departmentId: z.number().int().positive().optional(),
  positionId: z.number().int().positive().optional(),
  status: z.enum(['PENDING_ONBOARDING', 'ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  onboardingStatus: z.enum(['PENDING_ONBOARDING', 'DOCUMENT_COLLECTION', 'PROFILE_COMPLETED', 'ACTIVE']).optional()
});

export const uploadDocumentSchema = z.object({
  documentType: z.string().min(1),
});
