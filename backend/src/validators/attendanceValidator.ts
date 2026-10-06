import { z } from 'zod';

export const createShiftSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  breakDuration: z.number().int().min(0),
  workingDays: z.string()
});

export const assignShiftSchema = z.object({
  employeeId: z.number().int().positive(),
  shiftId: z.number().int().positive(),
  startDate: z.string().datetime(),
});

export const checkInSchema = z.object({
  employeeId: z.number().int().positive(),
  date: z.string().datetime(),
  time: z.string().datetime(),
});

export const checkOutSchema = z.object({
  time: z.string().datetime(),
});

export const createLeaveRequestSchema = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']),
});

export const createOvertimeRequestSchema = z.object({
  employeeId: z.number().int().positive(),
  date: z.string().datetime(),
  hours: z.number().positive(),
  reason: z.string().min(1),
});

export const generateTimesheetSchema = z.object({
  employeeId: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});
