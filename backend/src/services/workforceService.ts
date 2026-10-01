import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

const workforceInclude = {
  department: { select: { id: true, name: true, code: true } },
  position: { select: { id: true, title: true, code: true } },
  requester: { select: { id: true, email: true } },
  approver: { select: { id: true, email: true } },
  rejector: { select: { id: true, email: true } },
};

export const createWorkforceRequestInDB = async (data: {
  departmentId: number;
  positionId: number;
  requestedBy: number;
  headcount: number;
  justification: string;
}) => {
  const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!department) throw new AppError('Department not found', 404);
  if (department.status !== 'ACTIVE') throw new AppError('Cannot create request for inactive department', 400);

  const position = await prisma.position.findUnique({ where: { id: data.positionId } });
  if (!position) throw new AppError('Position not found', 404);
  if (position.departmentId !== data.departmentId) {
    throw new AppError('Position does not belong to the specified department', 400);
  }
  if (position.status !== 'OPEN') throw new AppError('Cannot create request for a closed or frozen position', 400);

  return await prisma.workforceRequest.create({
    data: {
      departmentId: data.departmentId,
      positionId: data.positionId,
      requestedBy: data.requestedBy,
      headcount: data.headcount,
      justification: data.justification,
      status: 'DRAFT',
    },
    include: workforceInclude,
  });
};

export const getWorkforceRequestByIdFromDB = async (id: number) => {
  const request = await prisma.workforceRequest.findUnique({
    where: { id },
    include: workforceInclude,
  });
  if (!request) throw new AppError('Workforce request not found', 404);
  return request;
};

export const listWorkforceRequestsFromDB = async (
  page: number,
  limit: number,
  status?: string,
  departmentId?: number
) => {
  const skip = (page - 1) * limit;
  const where: Prisma.WorkforceRequestWhereInput = {};
  if (status) where.status = status as any;
  if (departmentId) where.departmentId = departmentId;

  const [total, requests] = await Promise.all([
    prisma.workforceRequest.count({ where }),
    prisma.workforceRequest.findMany({
      where,
      skip,
      take: limit,
      include: workforceInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { requests, total };
};

export const updateWorkforceRequestInDB = async (
  id: number,
  data: {
    departmentId?: number;
    positionId?: number;
    headcount?: number;
    justification?: string;
  }
) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  if (request.status !== 'DRAFT') {
    throw new AppError('Only DRAFT workforce requests can be edited', 400);
  }

  // Validate department if changing
  const targetDeptId = data.departmentId || request.departmentId;
  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new AppError('Department not found', 404);
    if (department.status !== 'ACTIVE') throw new AppError('Cannot assign inactive department', 400);
  }

  // Validate position if changing
  if (data.positionId) {
    const position = await prisma.position.findUnique({ where: { id: data.positionId } });
    if (!position) throw new AppError('Position not found', 404);
    if (position.departmentId !== targetDeptId) {
      throw new AppError('Position does not belong to the specified department', 400);
    }
    if (position.status !== 'OPEN') throw new AppError('Cannot assign a closed or frozen position', 400);
  }

  return await prisma.workforceRequest.update({
    where: { id },
    data,
    include: workforceInclude,
  });
};

export const deleteWorkforceRequestFromDB = async (id: number) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  if (request.status !== 'DRAFT') {
    throw new AppError('Only DRAFT workforce requests can be deleted', 400);
  }

  return await prisma.workforceRequest.delete({ where: { id } });
};

// ========== Workflow Operations ==========

export const submitWorkforceRequestInDB = async (id: number) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  if (request.status !== 'DRAFT') {
    throw new AppError('Only DRAFT workforce requests can be submitted', 400);
  }

  return await prisma.workforceRequest.update({
    where: { id },
    data: { status: 'PENDING_APPROVAL' },
    include: workforceInclude,
  });
};

export const approveWorkforceRequestInDB = async (id: number, approvedBy: number) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  if (request.status !== 'PENDING_APPROVAL') {
    throw new AppError('Only PENDING_APPROVAL workforce requests can be approved', 400);
  }

  if (request.status === 'APPROVED' as any) {
    throw new AppError('Workforce request is already approved', 400);
  }

  return await prisma.workforceRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
    },
    include: workforceInclude,
  });
};

export const rejectWorkforceRequestInDB = async (
  id: number,
  rejectedBy: number,
  rejectionReason: string
) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  if (request.status !== 'PENDING_APPROVAL') {
    throw new AppError('Only PENDING_APPROVAL workforce requests can be rejected', 400);
  }

  return await prisma.workforceRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason,
    },
    include: workforceInclude,
  });
};

export const cancelWorkforceRequestInDB = async (id: number) => {
  const request = await prisma.workforceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError('Workforce request not found', 404);

  const cancellableStatuses = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'];
  if (!cancellableStatuses.includes(request.status)) {
    throw new AppError('Only DRAFT, SUBMITTED, or PENDING_APPROVAL workforce requests can be cancelled', 400);
  }

  return await prisma.workforceRequest.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: workforceInclude,
  });
};
