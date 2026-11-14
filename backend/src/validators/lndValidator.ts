import { z } from 'zod';

export const createTrainingCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updateTrainingCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const createTrainingSchema = z.object({
  title: z.string().min(1, 'Course title is required'),
  description: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive('Please select a valid category'),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
  provider: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'ONLINE', 'CLASSROOM']),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  cost: z.coerce.number().nonnegative().optional().nullable(),
});

export const updateTrainingSchema = z.object({
  title: z.string().min(1, 'Course title cannot be empty').optional(),
  description: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
  provider: z.string().optional().nullable(),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'ONLINE', 'CLASSROOM']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  cost: z.coerce.number().nonnegative().optional().nullable(),
});

export const createTrainingPlanSchema = z.object({
  trainingId: z.number().int().positive(),
  identifiedNeed: z.string().min(1),
  objective: z.string().min(1),
  targetEmployees: z.string().optional(),
  priority: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  plannedDate: z.string().optional(),
});

export const assignTrainingSchema = z.object({
  employeeIds: z.array(z.number().int().positive()).min(1),
});

export const createTrainingSessionSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  location: z.string().optional(),
});

export const markAttendanceSchema = z.object({
  employeeId: z.number().int().positive(),
  status: z.enum(['REGISTERED', 'ATTENDED', 'ABSENT']),
});

export const evaluateTrainingSchema = z.object({
  evaluatorId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
  comments: z.string().optional(),
});

export const updateEmployeeSkillSchema = z.object({
  skillName: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
});

export const updateTrainingStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
});

export const updateTrainingPlanStatusSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});
