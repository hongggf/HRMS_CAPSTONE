import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

export const createDepartmentInDB = async (data: { name: string; code: string; description?: string }) => {
  const existingName = await prisma.department.findUnique({ where: { name: data.name } });
  if (existingName) throw new AppError('Department name already exists', 409);

  const existingCode = await prisma.department.findUnique({ where: { code: data.code } });
  if (existingCode) throw new AppError('Department code already exists', 409);

  return await prisma.department.create({ data });
};

export const getDepartmentByIdFromDB = async (id: number) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      positions: {
        select: { id: true, title: true, code: true, status: true },
      },
    },
  });
  if (!department) throw new AppError('Department not found', 404);
  return department;
};

export const listDepartmentsFromDB = async (
  page: number,
  limit: number,
  status?: 'ACTIVE' | 'INACTIVE'
) => {
  const skip = (page - 1) * limit;
  const where: Prisma.DepartmentWhereInput = {};
  if (status) where.status = status;

  const [total, departments] = await Promise.all([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { positions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { departments, total };
};

export const updateDepartmentInDB = async (
  id: number,
  data: { name?: string; code?: string; description?: string | null; status?: 'ACTIVE' | 'INACTIVE' }
) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw new AppError('Department not found', 404);

  if (data.name && data.name !== department.name) {
    const existing = await prisma.department.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError('Department name already exists', 409);
  }

  if (data.code && data.code !== department.code) {
    const existing = await prisma.department.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError('Department code already exists', 409);
  }

  return await prisma.department.update({ where: { id }, data });
};

export const deleteDepartmentFromDB = async (id: number) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { positions: true, workforceRequests: true } } },
  });
  if (!department) throw new AppError('Department not found', 404);

  if (department._count.positions > 0) {
    throw new AppError('Cannot delete department with existing positions', 400);
  }
  if (department._count.workforceRequests > 0) {
    throw new AppError('Cannot delete department with existing workforce requests', 400);
  }

  return await prisma.department.delete({ where: { id } });
};
