import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

export const createUserInDB = async (email: string, passwordPlain: string, roleId?: number) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already exists', 409);

  const hashedPassword = await bcrypt.hash(passwordPlain, 10);
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      roles: roleId ? { create: { roleId } } : undefined,
    },
  });
};

export const listUsersFromDB = async (page: number, limit: number) => {
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

  const users = usersRaw.map(u => ({
    id: u.id,
    email: u.email,
    isActive: u.isActive,
    roles: u.roles.map(r => r.role.name)
  }));

  return { users, total };
};

export const updateUserStatusInDB = async (id: number, isActive: boolean, currentUserId?: number) => {
  if (!isActive && currentUserId && currentUserId === id) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new AppError('User not found', 404);

  if (!isActive) {
    const isHeadOfHr = user.roles.some((r) => r.role.name === 'HEAD_OF_HR');
    if (isHeadOfHr) {
      const activeAdminsCount = await prisma.user.count({
        where: {
          isActive: true,
          roles: {
            some: {
              role: { name: 'HEAD_OF_HR' },
            },
          },
        },
      });
      if (activeAdminsCount <= 1) {
        throw new AppError('Cannot deactivate the last active administrator', 400);
      }
    }
  }

  return await prisma.user.update({ where: { id }, data: { isActive } });
};

export const assignRoleToUserInDB = async (userId: number, roleId: number, _currentUserId?: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new AppError('User not found', 404);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('Role not found', 404);

  const isCurrentlyHeadOfHr = user.roles.some((r) => r.role.name === 'HEAD_OF_HR');
  if (isCurrentlyHeadOfHr && role.name !== 'HEAD_OF_HR') {
    const activeAdminsCount = await prisma.user.count({
      where: {
        isActive: true,
        roles: {
          some: {
            role: { name: 'HEAD_OF_HR' },
          },
        },
      },
    });
    if (activeAdminsCount <= 1) {
      throw new AppError('Cannot demote the last active administrator', 400);
    }
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.create({ data: { userId, roleId } })
  ]);
};
