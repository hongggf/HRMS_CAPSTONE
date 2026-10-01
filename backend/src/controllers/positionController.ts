import { Response, NextFunction } from 'express';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import * as positionService from '../services/positionService';

export const createPosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const position = await positionService.createPositionInDB(req.body);
    await logAudit('POSITION_CREATED', req.user?.id || null, { positionId: position.id });
    return sendSuccess(res, { position }, 'Position created successfully', undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const getPosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid position ID', 400);
    const position = await positionService.getPositionByIdFromDB(id);
    return sendSuccess(res, { position }, 'Position retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const listPositions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const status = req.query.status as 'OPEN' | 'CLOSED' | 'FROZEN' | undefined;

    if (limit > 100) throw new AppError('Limit cannot exceed 100', 400);

    const { positions, total } = await positionService.listPositionsFromDB(page, limit, departmentId, status);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return sendSuccess(res, { positions }, 'Positions retrieved successfully', meta);
  } catch (error) {
    next(error);
  }
};

export const updatePosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid position ID', 400);

    const position = await positionService.updatePositionInDB(id, req.body);
    await logAudit('POSITION_UPDATED', req.user?.id || null, { positionId: id });
    return sendSuccess(res, { position }, 'Position updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid position ID', 400);

    await positionService.deletePositionFromDB(id);
    await logAudit('POSITION_DELETED', req.user?.id || null, { positionId: id });
    return sendSuccess(res, null, 'Position deleted successfully');
  } catch (error) {
    next(error);
  }
};
