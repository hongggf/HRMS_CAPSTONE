import { Request, Response } from 'express';
import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { checkInSchema, checkOutSchema, createShiftSchema, assignShiftSchema, generateTimesheetSchema } from '../validators/attendanceValidator';
import { logAudit } from '../services/auditService';

const prisma = new PrismaClient();

export const createShift = async (req: Request, res: Response) => {
  try {
    const data = createShiftSchema.parse(req.body);
    const shift = await prisma.shift.create({ data });
    res.status(201).json(shift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const assignShift = async (req: Request, res: Response) => {
  try {
    const data = assignShiftSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const empShift = await prisma.employeeShift.create({
      data: {
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        startDate: data.startDate,
      }
    });

    await logAudit('SHIFT_ASSIGNED', userId, { employeeId: data.employeeId, shiftId: data.shiftId });
    res.status(201).json(empShift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const data = checkInSchema.parse(req.body);
    const userId = (req as any).user?.id || null;

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date: new Date(data.date) } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Duplicate check-in for the same date is not allowed' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date: new Date(data.date),
        checkIn: new Date(data.time),
        status: AttendanceStatus.PRESENT, // naive logic, can be LATE based on shift
      }
    });

    await logAudit('ATTENDANCE_CHECK_IN', userId, { attendanceId: attendance.id });
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const checkOut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = checkOutSchema.parse(req.body);
    const userId = (req as any).user?.id || null;

    const attendance = await prisma.attendance.findUnique({ where: { id: parseInt(id) } });
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });
    if (attendance.checkOut) return res.status(400).json({ error: 'Already checked out' });

    const checkInTime = new Date(attendance.checkIn!);
    const checkOutTime = new Date(data.time);
    const workingMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

    const updated = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: {
        checkOut: checkOutTime,
        workingMinutes,
      }
    });

    await logAudit('ATTENDANCE_CHECK_OUT', userId, { attendanceId: updated.id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const generateTimesheet = async (req: Request, res: Response) => {
  try {
    const data = generateTimesheetSchema.parse(req.body);
    const userId = (req as any).user!.id;

    // Fetch attendances in period
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: data.employeeId,
        date: { gte: new Date(data.startDate), lte: new Date(data.endDate) },
        checkOut: { not: null }
      }
    });

    // Fetch approved overtime in period
    const overtimes = await prisma.overtimeRequest.findMany({
      where: {
        employeeId: data.employeeId,
        status: 'APPROVED',
        date: { gte: new Date(data.startDate), lte: new Date(data.endDate) }
      }
    });

    const totalWorkingMinutes = attendances.reduce((acc, a) => acc + a.workingMinutes, 0);
    const regularHours = totalWorkingMinutes / 60;
    const overtimeHours = overtimes.reduce((acc, o) => acc + o.hours, 0);
    const totalHours = regularHours + overtimeHours;

    const timesheet = await prisma.timesheet.upsert({
      where: {
        employeeId_startDate_endDate: {
          employeeId: data.employeeId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        }
      },
      update: {
        regularHours,
        overtimeHours,
        totalHours
      },
      create: {
        employeeId: data.employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        regularHours,
        overtimeHours,
        totalHours,
        leaveHours: 0
      }
    });

    await logAudit('TIMESHEET_GENERATED', userId, { timesheetId: timesheet.id });
    res.json(timesheet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
