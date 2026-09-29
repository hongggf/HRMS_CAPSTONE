import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'supersecretkey';

    const decoded = jwt.verify(token, secret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'Unauthorized: User not found or disabled', 401);
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.action))
      )
    );

    req.user = {
      id: user.id,
      email: user.email,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    return sendError(res, 'Unauthorized: Invalid or expired token', 401);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return sendError(res, 'Forbidden: Insufficient role', 403);
    }
    next();
  };
};

export const requirePermission = (allowedPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const hasPerm = req.user.permissions.some((p) => allowedPermissions.includes(p));
    if (!hasPerm) {
      return sendError(res, 'Forbidden: Insufficient permission', 403);
    }
    next();
  };
};
