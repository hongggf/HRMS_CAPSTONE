import { Response, NextFunction } from 'express';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import * as workforceService from '../services/workforceService';

export const createWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const data = { ...req.body, requestedBy: req.user.id };
    const request = await workforceService.createWorkforceRequestInDB(data);
    await logAudit('WORKFORCE_CREATED', req.user.id, { workforceRequestId: request.id });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request created successfully', undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const getWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);
    const request = await workforceService.getWorkforceRequestByIdFromDB(id);
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const listWorkforceRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;

    if (limit > 100) throw new AppError('Limit cannot exceed 100', 400);

    const { requests, total } = await workforceService.listWorkforceRequestsFromDB(page, limit, status, departmentId);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return sendSuccess(res, { workforceRequests: requests }, 'Workforce requests retrieved successfully', meta);
  } catch (error) {
    next(error);
  }
};

export const updateWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    const request = await workforceService.updateWorkforceRequestInDB(id, req.body);
    await logAudit('WORKFORCE_UPDATED', req.user?.id || null, { workforceRequestId: id });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    await workforceService.deleteWorkforceRequestFromDB(id);
    await logAudit('WORKFORCE_DELETED', req.user?.id || null, { workforceRequestId: id });
    return sendSuccess(res, null, 'Workforce request deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const submitWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    const request = await workforceService.submitWorkforceRequestInDB(id);
    await logAudit('WORKFORCE_SUBMITTED', req.user?.id || null, { workforceRequestId: id });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request submitted successfully');
  } catch (error) {
    next(error);
  }
};

export const approveWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    const request = await workforceService.approveWorkforceRequestInDB(id, req.user.id);
    await logAudit('WORKFORCE_APPROVED', req.user.id, { workforceRequestId: id });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request approved successfully');
  } catch (error) {
    next(error);
  }
};

export const rejectWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    const { rejectionReason } = req.body;
    const request = await workforceService.rejectWorkforceRequestInDB(id, req.user.id, rejectionReason);
    await logAudit('WORKFORCE_REJECTED', req.user.id, { workforceRequestId: id, rejectionReason });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request rejected successfully');
  } catch (error) {
    next(error);
  }
};

export const cancelWorkforceRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid workforce request ID', 400);

    const request = await workforceService.cancelWorkforceRequestInDB(id);
    await logAudit('WORKFORCE_CANCELLED', req.user?.id || null, { workforceRequestId: id });
    return sendSuccess(res, { workforceRequest: request }, 'Workforce request cancelled successfully');
  } catch (error) {
    next(error);
  }
};
