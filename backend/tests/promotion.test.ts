import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 9: Promotion & PIP Management Integration Tests', () => {
  let hrPromoToken: string;
  let promoUserId: number;
  let headOfHrToken: string;
  let empId1: number;
  let currentPosId: number;
  let proposedPosId: number;
  let promotionId: number;
  let pipId: number;
  let itemId: number;

  beforeAll(async () => {
    // Cleanup Phase 9
    // Cleanup Employee & Positions
    // Setup Roles
    const headOfHrRole = (await prisma.role.upsert({ where: { name: 'HEAD_OF_HR' }, update: {}, create: { name: 'HEAD_OF_HR' } }))!;
    const hrPromoRole = (await prisma.role.upsert({ where: { name: 'HR_PROMOTION_P9' }, update: {}, create: { name: 'HR_PROMOTION_P9' } }))!;

    const perms = ['PROMOTION_CREATE', 'PROMOTION_APPROVE', 'PIP_CREATE', 'PIP_UPDATE'];
    for (const p of perms) {
      const perm = await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
      if (p !== 'PROMOTION_APPROVE') {
        await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: hrPromoRole.id, permissionId: perm.id } }, update: {}, create: { roleId: hrPromoRole.id, permissionId: perm.id } });
      }
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: headOfHrRole.id, permissionId: perm.id } }, update: {}, create: { roleId: headOfHrRole.id, permissionId: perm.id } });
    }

    const headUser = await prisma.user.create({ data: { email: 'head_p9@test.com', password: 'hash', roles: { create: { roleId: headOfHrRole.id } } } });
    headOfHrToken = generateToken(headUser.id, '15m');

    const promoUser = await prisma.user.create({ data: { email: 'promo_p9@test.com', password: 'hash', roles: { create: { roleId: hrPromoRole.id } } } });
    hrPromoToken = generateToken(promoUser.id, '15m');
    promoUserId = promoUser.id;

    const dept = await prisma.department.create({ data: { name: 'IT', code: 'IT_P9' } });
    const pos1 = await prisma.position.create({ data: { title: 'Eng I', code: 'E1_P9', departmentId: dept.id } });
    const pos2 = await prisma.position.create({ data: { title: 'Eng II', code: 'E2_P9', departmentId: dept.id } });

    currentPosId = pos1.id;
    proposedPosId = pos2.id;

    const emp = await prisma.employee.create({ data: { employeeId: 'EMP_P9_1', firstName: 'John', lastName: 'Doe', email: 'j1_p9@d.com', departmentId: dept.id, positionId: currentPosId, status: 'ACTIVE' } });
    empId1 = emp.id;

    await prisma.employeeCompensation.create({ data: { employeeId: empId1, basicSalary: 5000, effectiveDate: new Date('2026-01-01') } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('promotion request', async () => {
    const res = await request(app).post('/api/v1/promotions/requests').set('Authorization', `Bearer ${hrPromoToken}`).send({
      employeeId: empId1,
      proposedPositionId: proposedPosId,
      proposedSalary: 7000,
      reason: 'Excellent performance',
      effectiveDate: '2026-12-01T00:00:00Z'
    });
    expect(res.status).toBe(201);
    promotionId = res.body.id;
  });

  it('unauthorized approval rejected', async () => {
    const res = await request(app).post(`/api/v1/promotions/requests/${promotionId}/approve`).set('Authorization', `Bearer ${hrPromoToken}`);
    expect(res.status).toBe(403);
  });

  it('approval updates employee and history', async () => {
    const res = await request(app).post(`/api/v1/promotions/requests/${promotionId}/approve`).set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);

    const emp = await prisma.employee.findUnique({ where: { id: empId1 }, include: { compensation: true } });
    expect(emp?.positionId).toBe(proposedPosId);
    expect(emp?.compensation?.basicSalary).toBe(7000);

    const posHist = await prisma.employeePositionHistory.findFirst({ where: { employeeId: empId1 }, orderBy: { id: 'desc' } });
    expect(posHist?.positionId).toBe(proposedPosId);

    const salHist = await prisma.employeeSalaryHistory.findFirst({ where: { employeeId: empId1 }, orderBy: { id: 'desc' } });
    expect(salHist?.baseSalary).toBe(7000);
    expect(salHist?.changeReason).toBe('PROMOTION');
  });

  it('rejection', async () => {
    // Create another request
    const p = await prisma.promotionRequest.create({
      data: { employeeId: empId1, currentPositionId: proposedPosId, proposedPositionId: currentPosId, reason: 'Test', effectiveDate: new Date(), requestedById: promoUserId }
    });
    const res = await request(app).post(`/api/v1/promotions/requests/${p.id}/reject`).set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
  });

  it('improvement plan', async () => {
    const res = await request(app).post('/api/v1/promotions/pips').set('Authorization', `Bearer ${hrPromoToken}`).send({
      employeeId: empId1,
      reason: 'Low quality code',
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      objective: 'Zero critical bugs'
    });
    expect(res.status).toBe(201);
    pipId = res.body.id;
  });

  it('add pip item', async () => {
    const res = await request(app).post(`/api/v1/promotions/pips/${pipId}/items`).set('Authorization', `Bearer ${hrPromoToken}`).send({
      action: 'Write unit tests',
      target: '100% coverage',
      owner: 'John Doe',
      dueDate: '2026-11-01T00:00:00Z'
    });
    expect(res.status).toBe(201);
    itemId = res.body.id;
  });

  it('progress updates', async () => {
    const res = await request(app).put(`/api/v1/promotions/pips/items/${itemId}/progress`).set('Authorization', `Bearer ${hrPromoToken}`).send({
      progress: 50
    });
    expect(res.status).toBe(200);
    expect(res.body.progress).toBe(50);
  });
});
