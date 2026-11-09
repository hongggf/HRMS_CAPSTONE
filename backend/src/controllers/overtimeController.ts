import { Request, Response } from 'express';
import { RequestStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createOvertimeRequestSchema, updateRequestStatusSchema } from '../validators/attendanceValidator';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';

export const createOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const data = createOvertimeRequestSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (data.hours <= 0 || data.hours > 24) {
      return res.status(400).json({ error: 'Overtime hours must be between 0.5 and 24' });
    }

    const request = await prisma.overtimeRequest.create({
      data: {
        employeeId: data.employeeId,
        date: new Date(data.date),
        hours: data.hours,
        reason: data.reason,
        status: RequestStatus.SUBMITTED,
      },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });

    await logAudit('OVERTIME_REQUESTED', userId, { overtimeRequestId: request.id });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approveOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateRequestStatusSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const existing = await prisma.overtimeRequest.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true },
    });
    if (!existing) return res.status(404).json({ error: 'Overtime request not found' });

    // Enforce business rule: Never allow a user to approve their own request
    if (existing.employee?.userId && existing.employee.userId === userId) {
      return res.status(403).json({ error: 'Cannot approve your own overtime request' });
    }

    // Approval conflict check
    if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      return res.status(400).json({ error: `Request has already been ${existing.status.toLowerCase()}` });
    }

    const updated = await prisma.overtimeRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: status as RequestStatus,
        ...(status === 'APPROVED' ? { approvedBy: userId } : {}),
      },
      include: {
        employee: { include: { department: true, position: true } },
        approver: true,
      },
    });

    await logAudit('OVERTIME_STATUS_UPDATED', userId, { overtimeRequestId: id, status });
    if (existing.employee?.userId) {
      await notifyUser(
        existing.employee.userId,
        `Overtime ${status}`,
        `Your overtime request has been ${status.toLowerCase()}.`,
        status === 'APPROVED' ? 'SUCCESS' : 'INFO',
        'OvertimeRequest',
        String(updated.id),
      );
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOvertimeRequests = async (req: Request, res: Response) => {
  try {
    const { employeeId, status, date, startDate, endDate } = req.query;
    const where: any = {};

    if (employeeId) where.employeeId = parseInt(employeeId as string);
    if (status) where.status = status as RequestStatus;
    if (date) {
      where.date = new Date(date as string);
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const requests = await prisma.overtimeRequest.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
