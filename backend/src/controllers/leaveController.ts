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

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        status: RequestStatus.SUBMITTED
      }
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

    if (status !== 'APPROVED') {
      const updated = await prisma.leaveRequest.update({ where: { id: parseInt(id) }, data: { status: status as RequestStatus }, include: { employee: true } });
      if (updated.employee?.userId) await notifyUser(updated.employee.userId, `Leave ${status}`, `Your leave request has been ${status.toLowerCase()}.`, status === 'REJECTED' ? 'ALERT' : 'INFO', 'LeaveRequest', String(updated.id));
      return res.json(updated);
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id) },
      include: { leaveType: true }
    });
    if (!leaveRequest) return res.status(404).json({ error: 'Not found' });
    if (leaveRequest.status === 'APPROVED') return res.status(400).json({ error: 'Already approved' });

    // Calculate days requested (simplified: diff in days + 1)
    const daysRequested = Math.ceil((leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      if (leaveRequest.leaveType.requiresBalance) {
        const year = leaveRequest.startDate.getFullYear();
        const balanceRecord = await tx.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId_year: { employeeId: leaveRequest.employeeId, leaveTypeId: leaveRequest.leaveTypeId, year } }
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
          data: { used: balanceRecord.used + daysRequested }
        });
      }

      return await tx.leaveRequest.update({
        where: { id: parseInt(id) },
        data: { status: RequestStatus.APPROVED, approvedBy: userId }
      });
    });

    await logAudit('LEAVE_APPROVED', userId, { leaveRequestId: id });
    const uEmp = await prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
    if (uEmp?.userId) await notifyUser(uEmp.userId, 'Leave APPROVED', `Your leave request has been approved.`, 'SUCCESS', 'LeaveRequest', String(id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
