import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { logAudit } from '../services/auditService';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/response';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '7');

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      await logAudit('LOGIN_FAILED', null, { email, reason: 'unknown_user' });
      return sendError(res, 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      await logAudit('LOGIN_FAILED', user.id, { reason: 'disabled_user' });
      return sendError(res, 'Account is disabled', 401);
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      await logAudit('LOGIN_FAILED', user.id, { reason: 'invalid_password' });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Generate Tokens
    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES as any });
    
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    await logAudit('LOGIN', user.id);

    // Flatten user for frontend
    const flattenedUser = {
      id: user.id,
      email: user.email,
      roles: user.roles.map(r => r.role.name)
    };

    return sendSuccess(res, { accessToken, refreshToken: refreshTokenString, user: flattenedUser }, 'Login successful');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  try {
    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: storedToken.userId } });
    if (!user || !user.isActive) {
      return sendError(res, 'User disabled or not found', 401);
    }

    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES as any });

    return sendSuccess(res, { accessToken }, 'Token refreshed successfully');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  try {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId: req.user?.id },
        data: { revoked: true },
      });
    }

    if (req.user) {
      await logAudit('LOGOUT', req.user.id);
    }

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    return sendError(res, 'Internal server error', 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  return sendSuccess(res, { user: req.user }, 'Profile retrieved successfully');
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return sendError(res, 'User not found or disabled', 404);

    const validPass = await bcrypt.compare(oldPassword, user.password);
    if (!validPass) {
      await logAudit('PASSWORD_CHANGE_FAILED', userId, { reason: 'invalid_old_password' });
      return sendError(res, 'Invalid old password', 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Perform password update and token revocation in a transaction
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
    return sendError(res, 'Internal server error', 500);
  }
};
