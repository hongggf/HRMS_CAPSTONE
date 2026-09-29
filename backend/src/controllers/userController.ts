import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/response';

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, roleId } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendError(res, 'Email already exists', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roles: roleId ? { create: { roleId } } : undefined,
      },
    });

    await logAudit('USER_CREATED', req.user?.id || null, { newUserId: user.id });

    return sendSuccess(res, { user: { id: user.id, email: user.email } }, 'User created successfully', null, 201);
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [total, usersRaw] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, isActive: true, roles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Flatten the relational data for the frontend
    const users = usersRaw.map(u => ({
      id: u.id,
      email: u.email,
      isActive: u.isActive,
      roles: u.roles.map(r => r.role.name) // e.g., ["HR_ADMIN"] instead of [{role: {name: "HR_ADMIN"}}]
    }));

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    return sendSuccess(res, { users }, 'Users retrieved successfully', meta);
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const activateUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    await logAudit('USER_ACTIVATED', req.user?.id || null, { targetUserId: id });
    return sendSuccess(res, null, 'User activated successfully');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await logAudit('USER_DEACTIVATED', req.user?.id || null, { targetUserId: id });
    return sendSuccess(res, null, 'User deactivated successfully');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const assignRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleId } = req.body;
    
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.userRole.create({ data: { userId, roleId } });
    
    await logAudit('ROLE_ASSIGNED', req.user?.id || null, { targetUserId: userId, roleId });
    return sendSuccess(res, null, 'Role assigned successfully');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};
