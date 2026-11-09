import { Request, Response } from 'express';
import { AttendanceStatus } from '@prisma/client';
import { prisma } from '../config/db';
import {
  checkInSchema,
  checkOutSchema,
  createShiftSchema,
  assignShiftSchema,
  generateTimesheetSchema,
} from '../validators/attendanceValidator';
import { logAudit } from '../services/auditService';

export const createShift = async (req: Request, res: Response) => {
  try {
    const data = createShiftSchema.parse(req.body);
    const shift = await prisma.shift.create({ data });
    res.status(201).json(shift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getShifts = async (_req: Request, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: { select: { employeeShifts: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json(shifts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const assignShift = async (req: Request, res: Response) => {
  try {
    const data = assignShiftSchema.parse(req.body);
    const userId = (req as any).user!.id;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Verify shift exists
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const empShift = await prisma.employeeShift.upsert({
      where: { employeeId: data.employeeId },
      update: {
        shiftId: data.shiftId,
        startDate: new Date(data.startDate),
      },
      create: {
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        startDate: new Date(data.startDate),
      },
      include: {
        employee: { include: { department: true, position: true } },
        shift: true,
      },
    });

    await logAudit('SHIFT_ASSIGNED', userId, { employeeId: data.employeeId, shiftId: data.shiftId });
    res.status(201).json(empShift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getEmployeeShifts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;
    const where: any = {};
    if (employeeId) where.employeeId = parseInt(employeeId as string);

    const empShifts = await prisma.employeeShift.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
        shift: true,
      },
      orderBy: { id: 'desc' },
    });
    res.json(empShifts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const data = checkInSchema.parse(req.body);
    const userId = (req as any).user?.id || null;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if already checked in
    const checkInDate = new Date(data.date);
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date: checkInDate } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Duplicate check-in for the same date is not allowed' });
    }

    const checkInTime = new Date(data.time);
    let lateMinutes = 0;
    let status: AttendanceStatus = AttendanceStatus.PRESENT;

    // Check shift schedule if assigned
    const empShift = await prisma.employeeShift.findUnique({
      where: { employeeId: data.employeeId },
      include: { shift: true },
    });

    if (empShift?.shift) {
      const [shiftHour, shiftMinute] = empShift.shift.startTime.split(':').map(Number);
      const expectedTime = new Date(checkInDate);
      expectedTime.setUTCHours(shiftHour, shiftMinute, 0, 0);

      const diffMs = checkInTime.getTime() - expectedTime.getTime();
      if (diffMs > 0) {
        lateMinutes = Math.floor(diffMs / 60000);
        if (lateMinutes > 15) {
          status = AttendanceStatus.LATE;
        }
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date: checkInDate,
        checkIn: checkInTime,
        status,
        lateMinutes,
      },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });

    await logAudit('ATTENDANCE_CHECK_IN', userId, { attendanceId: attendance.id });
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const checkOut = async (req: Request, res: Response) => {
  try {
    let attendanceId = req.params.id ? parseInt(req.params.id) : null;
    const data = checkOutSchema.parse(req.body);
    const userId = (req as any).user?.id || null;

    if (!attendanceId && data.employeeId) {
      const active = await prisma.attendance.findFirst({
        where: {
          employeeId: data.employeeId,
          checkOut: null,
        },
        orderBy: { checkIn: 'desc' },
      });
      if (!active) {
        return res.status(404).json({ error: 'No active check-in record found for this employee' });
      }
      attendanceId = active.id;
    }

    if (!attendanceId) {
      return res.status(400).json({ error: 'Attendance ID or employee ID is required for check-out' });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: true },
    });
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });
    if (attendance.checkOut) return res.status(400).json({ error: 'Already checked out' });

    const checkInTime = new Date(attendance.checkIn!);
    const checkOutTime = new Date(data.time);

    if (checkOutTime.getTime() < checkInTime.getTime()) {
      return res.status(400).json({ error: 'Check-out time cannot be earlier than check-in time' });
    }

    const workingMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: checkOutTime,
        workingMinutes,
      },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });

    await logAudit('ATTENDANCE_CHECK_OUT', userId, { attendanceId: updated.id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAttendances = async (req: Request, res: Response) => {
  try {
    const { employeeId, status, date, startDate, endDate } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = parseInt(employeeId as string);
    if (status) where.status = status as AttendanceStatus;
    if (date) {
      where.date = new Date(date as string);
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true, position: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.employeeId || (req.query.employeeId as string);
    const employeeId = parseInt(rawId);
    if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

    // Look for latest punch today or unclosed punch
    const record = await prisma.attendance.findFirst({
      where: {
        employeeId,
      },
      orderBy: { date: 'desc' },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });

    res.json(record || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generateTimesheet = async (req: Request, res: Response) => {
  try {
    const data = generateTimesheetSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date' });
    }

    // Fetch attendances in period
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: data.employeeId,
        date: { gte: startDate, lte: endDate },
        checkOut: { not: null },
      },
    });

    // Fetch approved overtime in period
    const overtimes = await prisma.overtimeRequest.findMany({
      where: {
        employeeId: data.employeeId,
        status: 'APPROVED',
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalWorkingMinutes = attendances.reduce((acc, a) => acc + a.workingMinutes, 0);
    const regularHours = totalWorkingMinutes / 60;
    const overtimeHours = overtimes.reduce((acc, o) => acc + o.hours, 0);
    const totalHours = regularHours + overtimeHours;

    const timesheet = await prisma.timesheet.upsert({
      where: {
        employeeId_startDate_endDate: {
          employeeId: data.employeeId,
          startDate: startDate,
          endDate: endDate,
        },
      },
      update: {
        regularHours,
        overtimeHours,
        totalHours,
      },
      create: {
        employeeId: data.employeeId,
        startDate: startDate,
        endDate: endDate,
        regularHours,
        overtimeHours,
        totalHours,
        leaveHours: 0,
      },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });

    await logAudit('TIMESHEET_GENERATED', userId, { timesheetId: timesheet.id });
    res.json(timesheet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = parseInt(employeeId as string);
    if (startDate) where.startDate = { gte: new Date(startDate as string) };
    if (endDate) where.endDate = { lte: new Date(endDate as string) };

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(timesheets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
