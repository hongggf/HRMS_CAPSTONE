import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 8: Performance Management Integration Tests', () => {
  let hrPerfToken: string;
  let headOfHrToken: string;
  let empId1: number;
  let reviewerId: number;
  let cycleId: number;
  let goalId1: number;
  let goalId2: number;
  let kpiId: number;
  let reviewId: number;

  beforeAll(async () => {
    // Cleanup Phase 8 tables
    await prisma.feedback.deleteMany();
    await prisma.performanceRating.deleteMany();
    await prisma.performanceReview.deleteMany();
    await prisma.employeeGoal.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.kPI.deleteMany();
    await prisma.performanceCycle.deleteMany();

    // Cleanup Employee, Department, User roles
    await prisma.employee.deleteMany();
    await prisma.position.deleteMany();
    await prisma.department.deleteMany();
    await prisma.payrollAdjustment.deleteMany(); await prisma.payrollApproval.deleteMany(); await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    // Setup Roles
    const headOfHrRole = await prisma.role.create({ data: { name: 'HEAD_OF_HR_P8' } });
    const hrPerfRole = await prisma.role.create({ data: { name: 'HR_PERFORMANCE_P8' } });

    const perms = ['PERFORMANCE_CREATE', 'PERFORMANCE_READ', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE'];
    for (const p of perms) {
      const perm = await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
      if (p !== 'PERFORMANCE_APPROVE') {
        await prisma.rolePermission.create({ data: { roleId: hrPerfRole.id, permissionId: perm.id } });
      }
      await prisma.rolePermission.create({ data: { roleId: headOfHrRole.id, permissionId: perm.id } });
    }

    const headUser = await prisma.user.create({ data: { email: 'head_p8@test.com', password: 'hash', roles: { create: { roleId: headOfHrRole.id } } } });
    headOfHrToken = generateToken(headUser.id, '15m');

    const perfUser = await prisma.user.create({ data: { email: 'perf_p8@test.com', password: 'hash', roles: { create: { roleId: hrPerfRole.id } } } });
    hrPerfToken = generateToken(perfUser.id, '15m');

    // Create Employees
    const dept = await prisma.department.create({ data: { name: 'IT', code: 'IT_P8' } });
    const pos = await prisma.position.create({ data: { title: 'Eng', code: 'E1_P8', departmentId: dept.id } });

    const emp1 = await prisma.employee.create({ data: { employeeId: 'EMP_P8_1', firstName: 'John', lastName: 'Doe', email: 'j1_p8@d.com', departmentId: dept.id, positionId: pos.id, status: 'ACTIVE' } });
    empId1 = emp1.id;

    const emp2 = await prisma.employee.create({ data: { employeeId: 'EMP_P8_2', firstName: 'Jane', lastName: 'Manager', email: 'm1_p8@d.com', departmentId: dept.id, positionId: pos.id, status: 'ACTIVE' } });
    reviewerId = emp2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('create performance cycle', async () => {
    const res = await request(app).post('/api/v1/performance/cycles').set('Authorization', `Bearer ${hrPerfToken}`).send({
      name: 'Q1 2026',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-03-31T23:59:59Z'
    });
    expect(res.status).toBe(201);
    cycleId = res.body.id;
  });

  it('goal creation', async () => {
    const res1 = await request(app).post('/api/v1/performance/goals').set('Authorization', `Bearer ${hrPerfToken}`).send({
      cycleId,
      employeeId: empId1,
      title: 'Ship Phase 8',
      weight: 60,
      dueDate: '2026-03-31T23:59:59Z'
    });
    expect(res1.status).toBe(201);
    goalId1 = res1.body.id;

    const res2 = await request(app).post('/api/v1/performance/goals').set('Authorization', `Bearer ${hrPerfToken}`).send({
      cycleId,
      employeeId: empId1,
      title: 'Mentorship',
      weight: 40,
      dueDate: '2026-03-31T23:59:59Z'
    });
    expect(res2.status).toBe(201);
    goalId2 = res2.body.id;
  });

  it('KPI assignment', async () => {
    const kpi = await prisma.kPI.create({ data: { name: 'Features Shipped', metric: 'Count' } });
    kpiId = kpi.id;

    const res = await request(app).post(`/api/v1/performance/goals/${goalId1}/kpi`).set('Authorization', `Bearer ${hrPerfToken}`).send({
      kpiId,
      targetValue: 10
    });
    expect(res.status).toBe(201);
  });

  it('create review', async () => {
    const res = await request(app).post('/api/v1/performance/reviews').set('Authorization', `Bearer ${hrPerfToken}`).send({
      cycleId,
      employeeId: empId1,
      reviewerId
    });
    expect(res.status).toBe(201);
    reviewId = res.body.id;
  });

  it('evaluation and weighted calculation', async () => {
    // Goal 1 Weight = 60, Rating = 4 -> 240
    // Goal 2 Weight = 40, Rating = 3 -> 120
    // Total Weighted = 360 / 100 = 3.6
    const res = await request(app).post(`/api/v1/performance/reviews/${reviewId}/evaluate`).set('Authorization', `Bearer ${hrPerfToken}`).send({
      ratings: [
        { goalId: goalId1, rating: 4, comment: 'Great job shipping' },
        { goalId: goalId2, rating: 3, comment: 'Met expectations' }
      ],
      comments: 'Solid quarter overall.',
      employeeFeedback: 'I feel good.',
      managerFeedback: 'Keep it up.'
    });
    expect(res.status).toBe(200);
    expect(res.body.overallScore).toBe(3.6);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('HR review / approve', async () => {
    // HR Perf cannot approve. HEAD_OF_HR approves.
    // wait, HR Perf should push to HEAD_OF_HR_REVIEW ? I called it approveReview.
    const res = await request(app).post(`/api/v1/performance/reviews/${reviewId}/approve`).set('Authorization', `Bearer ${hrPerfToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEAD_OF_HR_REVIEW');
  });

  it('HEAD_OF_HR finalizes review', async () => {
    const res = await request(app).post(`/api/v1/performance/reviews/${reviewId}/finalize`).set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FINALIZED');
  });

  it('modification of finalized review rejected', async () => {
    const res = await request(app).post(`/api/v1/performance/reviews/${reviewId}/evaluate`).set('Authorization', `Bearer ${hrPerfToken}`).send({
      ratings: [{ goalId: goalId1, rating: 5 }]
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot modify finalized review');
  });

  it('unauthorized user cannot finalize', async () => {
    // hrPerfToken lacks PERFORMANCE_APPROVE
    const res = await request(app).post(`/api/v1/performance/reviews/${reviewId}/finalize`).set('Authorization', `Bearer ${hrPerfToken}`);
    expect(res.status).toBe(403);
  });
});
