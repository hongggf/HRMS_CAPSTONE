import { z } from 'zod';

export const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date or datetime format',
});

export const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  breakDuration: z.number().int().min(0, 'Break duration must be non-negative'),
  workingDays: z.string().min(1, 'Working days are required'),
});

export const assignShiftSchema = z.object({
  employeeId: z.number().int().positive('Valid employee ID is required'),
  shiftId: z.number().int().positive('Valid shift ID is required'),
  startDate: dateStringSchema,
});

export const checkInSchema = z.object({
  employeeId: z.number().int().positive('Valid employee ID is required'),
  date: dateStringSchema,
  time: dateStringSchema,
});

export const checkOutSchema = z.object({
  time: dateStringSchema,
  employeeId: z.number().int().positive().optional(),
});

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.number().int().positive('Valid employee ID is required'),
    leaveTypeId: z.number().int().positive('Valid leave type ID is required'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    reason: z.string().min(1, 'Reason is required'),
  })
  .refine((data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(), {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });

export const updateRequestStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']),
});

export const createOvertimeRequestSchema = z.object({
  employeeId: z.number().int().positive('Valid employee ID is required'),
  date: dateStringSchema,
  hours: z.number().positive('Hours must be positive').max(24, 'Hours cannot exceed 24 in a single day'),
  reason: z.string().min(1, 'Reason is required'),
});

export const generateTimesheetSchema = z
  .object({
    employeeId: z.number().int().positive('Valid employee ID is required'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .refine((data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(), {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });
