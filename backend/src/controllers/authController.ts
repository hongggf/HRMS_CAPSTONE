import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import { generateTokens, revokeRefreshTokens } from '../services/authService';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      await logAudit('LOGIN_FAILED', null, { email, reason: 'unknown_user' });
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      await logAudit('LOGIN_FAILED', user.id, { reason: 'disabled_user' });
      throw new AppError('Account is disabled', 401);
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      await logAudit('LOGIN_FAILED', user.id, { reason: 'invalid_password' });
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = await generateTokens(user.id);
    await logAudit('LOGIN', user.id);

    const flattenedUser = {
      id: user.id,
      email: user.email,
      roles: user.roles.map(r => r.role.name)
    };

    return sendSuccess(res, { ...tokens, user: flattenedUser }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  
  try {
    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: storedToken.userId } });
    if (!user || !user.isActive) {
      throw new AppError('User disabled or not found', 401);
    }

    const accessToken = jwt.sign({ id: user.id }, env.JWT_SECRET, { 
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
      algorithm: 'HS256'
    });

    return sendSuccess(res, { accessToken }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  try {
    if (refreshToken && req.user) {
      await revokeRefreshTokens(req.user.id, refreshToken);
    }
    if (req.user) {
      await logAudit('LOGOUT', req.user.id);
    }
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, { user: req.user }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new AppError('User not found or disabled', 404);

    const validPass = await bcrypt.compare(oldPassword, user.password);
    if (!validPass) {
      await logAudit('PASSWORD_CHANGE_FAILED', userId, { reason: 'invalid_old_password' });
      throw new AppError('Invalid old password', 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: userId, revoked: false },
        data: { revoked: true },
      })
    ]);

    await logAudit('PASSWORD_CHANGED', userId);
    return sendSuccess(res, null, 'Password changed successfully. Please log in again.');
  } catch (error) {
    next(error);
  }
};
