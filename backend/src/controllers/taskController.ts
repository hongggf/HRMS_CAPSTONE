import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import * as taskService from '../services/taskService';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const result = await taskService.getUnifiedTasks(
      req.user.id,
      req.user.roles,
      req.query as any,
    );

    return sendSuccess(
      res,
      { tasks: result.tasks },
      'Tasks retrieved successfully',
      result.meta,
    );
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const task = await taskService.createUnifiedTask(
      req.user.id,
      req.user.roles,
      req.user.email,
      req.body,
    );

    return sendSuccess(res, { task }, 'Task created successfully');
  } catch (error) {
    next(error);
  }
};

export const submitTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { type, id } = req.params;
    const task = await taskService.submitUnifiedTask(
      req.user.id,
      req.user.roles,
      req.user.email,
      type,
      parseInt(id, 10),
    );

    return sendSuccess(res, { task }, 'Task submitted for approval successfully');
  } catch (error) {
    next(error);
  }
};

export const approveTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { type, id } = req.params;
    const task = await taskService.approveUnifiedTask(
      req.user.id,
      req.user.roles,
      type,
      parseInt(id, 10),
    );

    return sendSuccess(res, { task }, 'Task approved successfully');
  } catch (error) {
    next(error);
  }
};

export const rejectTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { type, id } = req.params;
    const { rejectionReason } = req.body;

    const task = await taskService.rejectUnifiedTask(
      req.user.id,
      req.user.roles,
      type,
      parseInt(id, 10),
      rejectionReason,
    );

    return sendSuccess(res, { task }, 'Task rejected successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { type, id } = req.params;
    await taskService.deleteUnifiedTask(
      req.user.id,
      req.user.roles,
      type,
      parseInt(id, 10),
    );

    return sendSuccess(res, null, 'Draft task deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const followUpTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { type, id } = req.params;
    const result = await taskService.followUpUnifiedTask(
      req.user.id,
      req.user.roles,
      req.user.email,
      type,
      parseInt(id, 10),
    );

    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};
