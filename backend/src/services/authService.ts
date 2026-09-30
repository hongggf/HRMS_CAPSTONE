import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logAudit } from './auditService';

export const generateTokens = async (userId: number) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    algorithm: 'HS256',
  });

  const refreshTokenString = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parseInt(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: refreshTokenString };
};

export const revokeRefreshTokens = async (userId: number, token?: string) => {
  const where: any = { userId };
  if (token) where.token = token;
  await prisma.refreshToken.updateMany({
    where,
    data: { revoked: true },
  });
};
