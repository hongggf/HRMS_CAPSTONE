import { Response, NextFunction } from 'express';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import * as userService from '../services/userService';

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { email, password, roleId } = req.body;
  try {
    const user = await userService.createUserInDB(email, password, roleId);
    await logAudit('USER_CREATED', req.user?.id || null, { newUserId: user.id });

    return sendSuccess(res, { user: { id: user.id, email: user.email } }, 'User created successfully', undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Prevent abuse
    if (limit > 100) throw new AppError('Limit cannot exceed 100', 400);

    const { users, total } = await userService.listUsersFromDB(page, limit);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    return sendSuccess(res, { users }, 'Users retrieved successfully', meta);
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid user ID', 400);

    await userService.updateUserStatusInDB(id, true);
    await logAudit('USER_ACTIVATED', req.user?.id || null, { targetUserId: id });
    return sendSuccess(res, null, 'User activated successfully');
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid user ID', 400);

    await userService.updateUserStatusInDB(id, false);
    await logAudit('USER_DEACTIVATED', req.user?.id || null, { targetUserId: id });
    return sendSuccess(res, null, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400);
    const { roleId } = req.body;
    
    await userService.assignRoleToUserInDB(userId, roleId);
    
    await logAudit('ROLE_ASSIGNED', req.user?.id || null, { targetUserId: userId, roleId });
    return sendSuccess(res, null, 'Role assigned successfully');
  } catch (error) {
    next(error);
  }
};
