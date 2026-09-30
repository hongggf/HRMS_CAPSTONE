import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { sendError } from '../utils/response';
import { env } from '../config/env';
import { z } from 'zod';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

const jwtPayloadSchema = z.object({
  id: z.number(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Unauthorized: Missing or invalid token format', 401);
    }

    const token = authHeader.split(' ')[1];

    let decodedRaw;
    try {
      decodedRaw = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Unauthorized: Token expired', 401);
      }
      return sendError(res, 'Unauthorized: Invalid token', 401);
    }

    const decoded = jwtPayloadSchema.safeParse(decodedRaw);
    if (!decoded.success) {
      return sendError(res, 'Unauthorized: Malformed token payload', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.data.id },
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
    return sendError(res, 'Internal server error during authentication', 500);
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
