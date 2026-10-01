import { Response, NextFunction } from 'express';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import * as departmentService from '../services/departmentService';

export const createDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const department = await departmentService.createDepartmentInDB(req.body);
    await logAudit('DEPARTMENT_CREATED', req.user?.id || null, { departmentId: department.id });
    return sendSuccess(res, { department }, 'Department created successfully', undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const getDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid department ID', 400);
    const department = await departmentService.getDepartmentByIdFromDB(id);
    return sendSuccess(res, { department }, 'Department retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const listDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as 'ACTIVE' | 'INACTIVE' | undefined;

    if (limit > 100) throw new AppError('Limit cannot exceed 100', 400);

    const { departments, total } = await departmentService.listDepartmentsFromDB(page, limit, status);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return sendSuccess(res, { departments }, 'Departments retrieved successfully', meta);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid department ID', 400);

    const department = await departmentService.updateDepartmentInDB(id, req.body);
    await logAudit('DEPARTMENT_UPDATED', req.user?.id || null, { departmentId: id });
    return sendSuccess(res, { department }, 'Department updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid department ID', 400);

    await departmentService.deleteDepartmentFromDB(id);
    await logAudit('DEPARTMENT_DELETED', req.user?.id || null, { departmentId: id });
    return sendSuccess(res, null, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};
