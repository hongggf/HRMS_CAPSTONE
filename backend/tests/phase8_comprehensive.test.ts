import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string = '1h') =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 8 Comprehensive Backend Requirements & Edge Cases Tests', () => {
  let headOfHrToken: string;
  let hrPerfToken: string;
  let hrLndToken: string;
  let standardEmpToken: string;

  let emp1Id: number;
  let emp2Id: number;
  let deptId: number;
  let pos1Id: number;
  let pos2Id: number;

  let cycleId: number;
  let goal1Id: number;
  let reviewId: number;
  let finalizedReviewId: number;

  let trainingId: number;
  let sessionId: number;

  beforeAll(async () => {
    // 1. Roles & Permissions setup
    const headRole = await prisma.role.upsert({ where: { name: 'HEAD_OF_HR' }, update: {}, create: { name: 'HEAD_OF_HR' } });
    const perfRole = await prisma.role.upsert({ where: { name: 'HR_PERFORMANCE' }, update: {}, create: { name: 'HR_PERFORMANCE' } });
    const lndRole = await prisma.role.upsert({ where: { name: 'HR_LND' }, update: {}, create: { name: 'HR_LND' } });
    const empRole = await prisma.role.upsert({ where: { name: 'EMPLOYEE_ROLE' }, update: {}, create: { name: 'EMPLOYEE_ROLE' } });

    const allPerms = [
      'PERFORMANCE_CREATE', 'PERFORMANCE_READ', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE',
      'PROMOTION_CREATE', 'PROMOTION_READ', 'PROMOTION_APPROVE',
      'PIP_CREATE', 'PIP_UPDATE',
      'LND_CREATE', 'LND_READ', 'LND_UPDATE'
    ];

    for (const p of allPerms) {
      const perm = await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: headRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: headRole.id, permissionId: perm.id },
      });

      if (['PERFORMANCE_CREATE', 'PERFORMANCE_READ', 'PERFORMANCE_UPDATE', 'PROMOTION_CREATE', 'PROMOTION_READ', 'PIP_CREATE', 'PIP_UPDATE'].includes(p)) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: perfRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: perfRole.id, permissionId: perm.id },
        });
      }

      if (['LND_CREATE', 'LND_READ', 'LND_UPDATE'].includes(p)) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: lndRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: lndRole.id, permissionId: perm.id },
        });
      }
    }

    // 2. Users
    const headUser = await prisma.user.create({
      data: { email: 'head_comp_p8@test.com', password: 'hash', roles: { create: { roleId: headRole.id } } },
    });
    headOfHrToken = generateToken(headUser.id);

    const perfUser = await prisma.user.create({
      data: { email: 'perf_comp_p8@test.com', password: 'hash', roles: { create: { roleId: perfRole.id } } },
    });
    hrPerfToken = generateToken(perfUser.id);

    const lndUser = await prisma.user.create({
      data: { email: 'lnd_comp_p8@test.com', password: 'hash', roles: { create: { roleId: lndRole.id } } },
    });
    hrLndToken = generateToken(lndUser.id);

    const empUser = await prisma.user.create({
      data: { email: 'emp_standard_p8@test.com', password: 'hash', roles: { create: { roleId: empRole.id } } },
    });
    standardEmpToken = generateToken(empUser.id);

    // 3. Organization & Employees
    const dept = await prisma.department.create({ data: { name: 'Eng Comp', code: 'ENG_P8_C' } });
    deptId = dept.id;

    const pos1 = await prisma.position.create({ data: { title: 'Junior Dev', code: 'DEV_JR_P8', departmentId: deptId } });
    pos1Id = pos1.id;

    const pos2 = await prisma.position.create({ data: { title: 'Senior Dev', code: 'DEV_SR_P8', departmentId: deptId } });
    pos2Id = pos2.id;

    const emp1 = await prisma.employee.create({
      data: {
        employeeId: 'EMP_C_01',
        firstName: 'Alice',
        lastName: 'Engineer',
        email: 'alice.c@test.com',
        departmentId: deptId,
        positionId: pos1Id,
        status: 'ACTIVE',
      },
    });
    emp1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        employeeId: 'EMP_C_02',
        firstName: 'Bob',
        lastName: 'Reviewer',
        email: 'bob.c@test.com',
        departmentId: deptId,
        positionId: pos2Id,
        status: 'ACTIVE',
      },
    });
    emp2Id = emp2.id;

    await prisma.employeeCompensation.create({
      data: { employeeId: emp1Id, basicSalary: 4000, effectiveDate: new Date('2026-01-01') },
    });

    // 4. Performance Cycle & Goal setup
    const cycle = await prisma.performanceCycle.create({
      data: {
        name: '2026 Comprehensive Cycle',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'OPEN',
      },
    });
    cycleId = cycle.id;

    const goal1 = await prisma.goal.create({
      data: {
        cycleId,
        employeeId: emp1Id,
        title: 'Core Deliverables',
        weight: 100,
        dueDate: new Date('2026-12-31'),
      },
    });
    goal1Id = goal1.id;

    const review = await prisma.performanceReview.create({
      data: {
        cycleId,
        employeeId: emp1Id,
        reviewerId: emp2Id,
        status: 'DRAFT',
      },
    });
    reviewId = review.id;

    const finReview = await prisma.performanceReview.create({
      data: {
        cycleId,
        employeeId: emp2Id,
        reviewerId: emp1Id,
        status: 'FINALIZED',
        overallScore: 4.8,
      },
    });
    finalizedReviewId = finReview.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Performance Evaluation Scales & Validation', () => {
    it('rejects evaluation with score > 5', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${reviewId}/evaluate`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          ratings: [{ goalId: goal1Id, rating: 6, comment: 'Exceeded max scale' }],
          comments: 'High performer',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects evaluation with score < 0', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${reviewId}/evaluate`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          ratings: [{ goalId: goal1Id, rating: -1 }],
        });
      expect(res.status).toBe(400);
    });

    it('rejects incomplete evaluation missing ratings array', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${reviewId}/evaluate`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          ratings: [],
          comments: 'No goals rated',
        });
      expect(res.status).toBe(400);
    });

    it('successfully evaluates review with valid 0-5 score and computes score', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${reviewId}/evaluate`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          ratings: [{ goalId: goal1Id, rating: 4.5, comment: 'Outstanding velocity' }],
          comments: 'Recommended for promotion',
          managerFeedback: 'Keep mentoring peers',
        });
      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBe(4.5);
      expect(res.body.status).toBe('SUBMITTED');
    });

    it('prevents modifying a finalized review', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${finalizedReviewId}/evaluate`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          ratings: [{ goalId: goal1Id, rating: 3 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot modify finalized review');
    });

    it('prevents repeated finalization of an already finalized review', async () => {
      const res = await request(app)
        .post(`/api/v1/performance/reviews/${finalizedReviewId}/finalize`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Already finalized');
    });

    it('prevents accidental duplicate review creation for employee in same cycle', async () => {
      const res = await request(app)
        .post('/api/v1/performance/reviews')
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          cycleId,
          employeeId: emp1Id,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
    });

    it('validates date ranges when creating a cycle (endDate < startDate fails)', async () => {
      const res = await request(app)
        .post('/api/v1/performance/cycles')
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          name: 'Invalid Date Cycle',
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-01-01T00:00:00Z',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('2. Promotion & Salary Increase Restrictions', () => {
    let promoId: number;

    it('allows HR_PERFORMANCE to submit promotion request', async () => {
      const res = await request(app)
        .post('/api/v1/promotions/requests')
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          employeeId: emp1Id,
          proposedPositionId: pos2Id,
          proposedSalary: 5500,
          reason: 'Solid review score and leadership',
          performanceReviewId: reviewId,
          effectiveDate: '2026-10-01T00:00:00Z',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUBMITTED');
      promoId = res.body.id;
    });

    it('restricts promotion approval from non-HEAD_OF_HR roles', async () => {
      const res = await request(app)
        .post(`/api/v1/promotions/requests/${promoId}/approve`)
        .set('Authorization', `Bearer ${hrPerfToken}`);
      expect(res.status).toBe(403);
    });

    it('allows HEAD_OF_HR to approve promotion and updates salary & position', async () => {
      const res = await request(app)
        .post(`/api/v1/promotions/requests/${promoId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');

      // Verify employee updated
      const updatedEmp = await prisma.employee.findUnique({
        where: { id: emp1Id },
        include: { compensation: true },
      });
      expect(updatedEmp?.positionId).toBe(pos2Id);
      expect(updatedEmp?.compensation?.basicSalary).toBe(5500);
    });

    it('prevents re-approving an already approved promotion', async () => {
      const res = await request(app)
        .post(`/api/v1/promotions/requests/${promoId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Already processed');
    });
  });

  describe('3. Performance Improvement Plan (PIP) Permissions & Invariants', () => {
    let pipId: number;
    let itemId: number;

    it('blocks unauthorized employee from creating PIP', async () => {
      const res = await request(app)
        .post('/api/v1/promotions/pips')
        .set('Authorization', `Bearer ${standardEmpToken}`)
        .send({
          employeeId: emp1Id,
          reason: 'Unauthorized test',
          startDate: '2026-05-01T00:00:00Z',
          endDate: '2026-08-01T00:00:00Z',
          objective: 'Test',
        });
      expect(res.status).toBe(403);
    });

    it('validates PIP date ranges (endDate before startDate fails)', async () => {
      const res = await request(app)
        .post('/api/v1/promotions/pips')
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          employeeId: emp1Id,
          reason: 'Code quality remediation',
          startDate: '2026-08-01T00:00:00Z',
          endDate: '2026-05-01T00:00:00Z',
          objective: 'Pass all tests',
        });
      expect(res.status).toBe(400);
    });

    it('allows HR_PERFORMANCE to create valid PIP and add action items', async () => {
      const res = await request(app)
        .post('/api/v1/promotions/pips')
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          employeeId: emp1Id,
          reason: 'Unit test code coverage improvement',
          startDate: '2026-05-01T00:00:00Z',
          endDate: '2026-08-01T00:00:00Z',
          objective: 'Achieve 85% coverage on microservices',
        });
      expect(res.status).toBe(201);
      pipId = res.body.id;

      const itemRes = await request(app)
        .post(`/api/v1/promotions/pips/${pipId}/items`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({
          action: 'Refactor test suite',
          target: '85% branch coverage',
          owner: 'Alice Engineer',
          dueDate: '2026-06-15T00:00:00Z',
        });
      expect(itemRes.status).toBe(201);
      itemId = itemRes.body.id;
    });

    it('updates PIP progress and validates range [0, 100]', async () => {
      const invalidRes = await request(app)
        .put(`/api/v1/promotions/pips/items/${itemId}/progress`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({ progress: 150 });
      expect(invalidRes.status).toBe(400);

      const validRes = await request(app)
        .put(`/api/v1/promotions/pips/items/${itemId}/progress`)
        .set('Authorization', `Bearer ${hrPerfToken}`)
        .send({ progress: 100 });
      expect(validRes.status).toBe(200);
      expect(validRes.body.progress).toBe(100);
      expect(validRes.body.completionDate).toBeDefined();
    });
  });

  describe('4. Learning & Development Module Workflows', () => {
    it('creates training course catalog item and session', async () => {
      const cat = await prisma.trainingCategory.create({
        data: { name: 'Comp Architecture', description: 'Systems engineering' },
      });

      const res = await request(app)
        .post('/api/v1/lnd/trainings')
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          title: 'Distributed Systems Patterns',
          categoryId: cat.id,
          type: 'CLASSROOM',
          capacity: 30,
          cost: 250,
        });
      expect(res.status).toBe(201);
      trainingId = res.body.id;

      const sessionRes = await request(app)
        .post(`/api/v1/lnd/trainings/${trainingId}/sessions`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          title: 'Consensus Protocols Deep Dive',
          date: '2026-07-15T09:00:00Z',
          location: 'Training Hall B',
        });
      expect(sessionRes.status).toBe(201);
      sessionId = sessionRes.body.id;
    });

    it('records and updates session attendance', async () => {
      const res = await request(app)
        .post(`/api/v1/lnd/sessions/${sessionId}/attendance`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          employeeId: emp1Id,
          status: 'ATTENDED',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ATTENDED');
      expect(res.body.attendedAt).toBeDefined();
    });

    it('validates course evaluation score range (1-5) and submits evaluation', async () => {
      const invalidRes = await request(app)
        .post(`/api/v1/lnd/trainings/${trainingId}/evaluations`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          evaluatorId: emp1Id,
          rating: 0,
        });
      expect(invalidRes.status).toBe(400);

      const validRes = await request(app)
        .post(`/api/v1/lnd/trainings/${trainingId}/evaluations`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          evaluatorId: emp1Id,
          rating: 5,
          feedback: 'Excellent practical insights into Raft and Paxos',
          comments: 'Would recommend to other seniors',
        });
      expect(validRes.status).toBe(201);
      expect(validRes.body.rating).toBe(5);
    });

    it('prevents accidental duplicate evaluation submission by the same evaluator', async () => {
      const res = await request(app)
        .post(`/api/v1/lnd/trainings/${trainingId}/evaluations`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          evaluatorId: emp1Id,
          rating: 4,
          feedback: 'Duplicate attempt',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already submitted');
    });

    it('updates employee skill level with verified permission', async () => {
      const res = await request(app)
        .post(`/api/v1/lnd/employees/${emp1Id}/skills`)
        .set('Authorization', `Bearer ${hrLndToken}`)
        .send({
          skillName: 'Distributed Consensus',
          level: 'ADVANCED',
        });
      expect(res.status).toBe(200);
      expect(res.body.level).toBe('ADVANCED');
    });
  });
});
