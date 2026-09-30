import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import * as roleService from '../services/roleService';

export const listRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await roleService.listRolesFromDB();
    return sendSuccess(res, { roles }, 'Roles retrieved successfully');
  } catch (error) {
    next(error);
  }
};
