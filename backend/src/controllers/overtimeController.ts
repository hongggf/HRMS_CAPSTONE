import { Request, Response } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { createOvertimeRequestSchema, updateRequestStatusSchema } from '../validators/attendanceValidator';
import { logAudit } from '../services/auditService';

const prisma = new PrismaClient();

export const createOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const data = createOvertimeRequestSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const request = await prisma.overtimeRequest.create({
      data: {
        employeeId: data.employeeId,
        date: new Date(data.date),
        hours: data.hours,
        reason: data.reason,
        status: RequestStatus.SUBMITTED
      }
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

    const updated = await prisma.overtimeRequest.update({
      where: { id: parseInt(id) },
      data: { 
        status: status as RequestStatus,
        ...(status === 'APPROVED' ? { approvedBy: userId } : {})
      }
    });

    await logAudit('OVERTIME_STATUS_UPDATED', userId, { overtimeRequestId: id, status });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
