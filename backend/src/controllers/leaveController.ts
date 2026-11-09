import { Request, Response } from 'express';
import { RequestStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createLeaveRequestSchema, updateRequestStatusSchema } from '../validators/attendanceValidator';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';

export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    const data = createLeaveRequestSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date' });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    // Check for overlapping leaves for this employee
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: [RequestStatus.SUBMITTED, RequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlapping) {
      return res.status(400).json({ error: 'Overlapping leave request already exists for this period' });
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate,
        endDate,
        reason: data.reason,
        status: RequestStatus.SUBMITTED,
      },
      include: {
        employee: { include: { department: true, position: true } },
        leaveType: true,
      },
    });

    await logAudit('LEAVE_REQUESTED', userId, { leaveRequestId: request.id });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approveLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateRequestStatusSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id) },
      include: { leaveType: true, employee: true },
    });
    if (!leaveRequest) return res.status(404).json({ error: 'Not found' });

    // Enforce business rule: Never allow a user to approve their own request
    if (leaveRequest.employee?.userId && leaveRequest.employee.userId === userId) {
      return res.status(403).json({ error: 'Cannot approve your own leave request' });
    }

    // Approval conflict
    if (leaveRequest.status === 'APPROVED' || leaveRequest.status === 'REJECTED') {
      return res.status(400).json({ error: `Request has already been ${leaveRequest.status.toLowerCase()}` });
    }

    if (status !== 'APPROVED') {
      const updated = await prisma.leaveRequest.update({
        where: { id: parseInt(id) },
        data: { status: status as RequestStatus },
        include: { employee: true, leaveType: true },
      });
      if (updated.employee?.userId) {
        await notifyUser(
          updated.employee.userId,
          `Leave ${status}`,
          `Your leave request has been ${status.toLowerCase()}.`,
          status === 'REJECTED' ? 'ALERT' : 'INFO',
          'LeaveRequest',
          String(updated.id),
        );
      }
      return res.json(updated);
    }

    // Calculate days requested (diff in days + 1)
    const daysRequested =
      Math.ceil((leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    // Use transaction to ensure atomic balance deduction
    const result = await prisma.$transaction(async (tx) => {
      if (leaveRequest.leaveType.requiresBalance) {
        const year = leaveRequest.startDate.getFullYear();
        const balanceRecord = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: leaveRequest.employeeId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year,
            },
          },
        });

        if (!balanceRecord) {
          throw new Error('No leave balance found for this year');
        }

        const remaining = balanceRecord.balance - balanceRecord.used;
        if (daysRequested > remaining) {
          throw new Error('Leave balance insufficient');
        }

        await tx.leaveBalance.update({
          where: { id: balanceRecord.id },
          data: { used: balanceRecord.used + daysRequested },
        });
      }

      return await tx.leaveRequest.update({
        where: { id: parseInt(id) },
        data: { status: RequestStatus.APPROVED, approvedBy: userId },
        include: { employee: true, leaveType: true, approver: true },
      });
    });

    await logAudit('LEAVE_APPROVED', userId, { leaveRequestId: id });
    const uEmp = await prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
    if (uEmp?.userId) {
      await notifyUser(
        uEmp.userId,
        'Leave APPROVED',
        `Your leave request has been approved.`,
        'SUCCESS',
        'LeaveRequest',
        String(id),
      );
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getLeaveRequests = async (req: Request, res: Response) => {
  try {
    const { employeeId, status, leaveTypeId, startDate, endDate } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = parseInt(employeeId as string);
    if (status) where.status = status as RequestStatus;
    if (leaveTypeId) where.leaveTypeId = parseInt(leaveTypeId as string);
    if (startDate) where.startDate = { gte: new Date(startDate as string) };
    if (endDate) where.endDate = { lte: new Date(endDate as string) };

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
        leaveType: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveTypes = async (_req: Request, res: Response) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(leaveTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveBalances = async (req: Request, res: Response) => {
  try {
    const { employeeId, year } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = parseInt(employeeId as string);
    if (year) where.year = parseInt(year as string);

    const balances = await prisma.leaveBalance.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
        leaveType: true,
      },
      orderBy: { year: 'desc' },
    });

    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
