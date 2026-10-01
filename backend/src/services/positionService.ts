import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

export const createPositionInDB = async (data: {
  title: string;
  code: string;
  departmentId: number;
  description?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  salaryMin?: number;
  salaryMax?: number;
}) => {
  const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!department) throw new AppError('Department not found', 404);
  if (department.status !== 'ACTIVE') throw new AppError('Cannot add position to inactive department', 400);

  const existingCode = await prisma.position.findUnique({ where: { code: data.code } });
  if (existingCode) throw new AppError('Position code already exists', 409);

  return await prisma.position.create({ data });
};

export const getPositionByIdFromDB = async (id: number) => {
  const position = await prisma.position.findUnique({
    where: { id },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });
  if (!position) throw new AppError('Position not found', 404);
  return position;
};

export const listPositionsFromDB = async (
  page: number,
  limit: number,
  departmentId?: number,
  status?: 'OPEN' | 'CLOSED' | 'FROZEN'
) => {
  const skip = (page - 1) * limit;
  const where: Prisma.PositionWhereInput = {};
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const [total, positions] = await Promise.all([
    prisma.position.count({ where }),
    prisma.position.findMany({
      where,
      skip,
      take: limit,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { positions, total };
};

export const updatePositionInDB = async (
  id: number,
  data: {
    title?: string;
    code?: string;
    departmentId?: number;
    description?: string | null;
    employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
    salaryMin?: number | null;
    salaryMax?: number | null;
    status?: 'OPEN' | 'CLOSED' | 'FROZEN';
  }
) => {
  const position = await prisma.position.findUnique({ where: { id } });
  if (!position) throw new AppError('Position not found', 404);

  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new AppError('Department not found', 404);
    if (department.status !== 'ACTIVE') throw new AppError('Cannot move position to inactive department', 400);
  }

  if (data.code && data.code !== position.code) {
    const existing = await prisma.position.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError('Position code already exists', 409);
  }

  // Cross-field salary validation with existing values
  const finalMin = data.salaryMin !== undefined ? data.salaryMin : position.salaryMin;
  const finalMax = data.salaryMax !== undefined ? data.salaryMax : position.salaryMax;
  if (finalMin !== null && finalMax !== null && finalMin !== undefined && finalMax !== undefined) {
    if (finalMax < finalMin) {
      throw new AppError('Salary maximum must be greater than or equal to salary minimum', 400);
    }
  }

  return await prisma.position.update({ where: { id }, data });
};

export const deletePositionFromDB = async (id: number) => {
  const position = await prisma.position.findUnique({
    where: { id },
    include: { _count: { select: { workforceRequests: true } } },
  });
  if (!position) throw new AppError('Position not found', 404);

  if (position._count.workforceRequests > 0) {
    throw new AppError('Cannot delete position with existing workforce requests', 400);
  }

  return await prisma.position.delete({ where: { id } });
};
