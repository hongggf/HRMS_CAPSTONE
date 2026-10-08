import { z } from 'zod';

export const createTrainingCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createTrainingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.number().int().positive(),
  provider: z.string().optional(),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'ONLINE', 'CLASSROOM']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  cost: z.number().nonnegative().optional(),
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
