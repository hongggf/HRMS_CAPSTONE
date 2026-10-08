import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Phase 3: Organization Structure & Workforce Planning', () => {
  let headOfHrUserId: number;
  let hrRecruitmentUserId: number;
  let noRoleUserId: number;
  let headOfHrToken: string;
  let hrRecruitmentToken: string;
  let noRoleToken: string;
  let testDepartmentId: number;
  let testPositionId: number;
  let testWorkforceRequestId: number;

  const JWT_SECRET = process.env.JWT_SECRET!;

  beforeAll(async () => {
    // Clean up in correct order (respect FK constraints)
    // Create roles
    const headOfHrRole = (await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' } }))!;
    const hrRecruitmentRole = (await prisma.role.findUnique({ where: { name: 'HR_RECRUITMENT' } }))!;

    // Create all permissions
    const allPermissions = [
      'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_ROLE_ASSIGN',
      'WORKFORCE_CREATE', 'WORKFORCE_READ', 'WORKFORCE_APPROVE',
      'DEPARTMENT_CREATE', 'DEPARTMENT_READ', 'DEPARTMENT_UPDATE',
      'POSITION_CREATE', 'POSITION_READ', 'POSITION_UPDATE',
    ];

    const permRecords = [];
    for (const action of allPermissions) {
      const perm = await prisma.permission.upsert({ where: { action }, update: {}, create: { action } });
      permRecords.push(perm);
    }

    // HEAD_OF_HR gets ALL permissions
    for (const perm of permRecords) {
      await prisma.rolePermission.create({
        data: { roleId: headOfHrRole.id, permissionId: perm.id },
      });
    }

    // HR_RECRUITMENT gets WORKFORCE_CREATE, WORKFORCE_READ, DEPARTMENT_READ, POSITION_READ
    const hrRecruitmentPerms = ['WORKFORCE_CREATE', 'WORKFORCE_READ', 'DEPARTMENT_READ', 'POSITION_READ'];
    for (const action of hrRecruitmentPerms) {
      const perm = permRecords.find(p => p.action === action)!;
      await prisma.rolePermission.create({
        data: { roleId: hrRecruitmentRole.id, permissionId: perm.id },
      });
    }

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const headOfHrUser = await prisma.user.create({
      data: {
        email: 'headhr@test.com',
        password: hashedPassword,
        isActive: true,
        roles: { create: { roleId: headOfHrRole.id } },
      },
    });
    headOfHrUserId = headOfHrUser.id;
    headOfHrToken = jwt.sign({ id: headOfHrUserId }, JWT_SECRET, { expiresIn: '15m' });

    const hrRecruitmentUser = await prisma.user.create({
      data: {
        email: 'recruitment@test.com',
        password: hashedPassword,
        isActive: true,
        roles: { create: { roleId: hrRecruitmentRole.id } },
      },
    });
    hrRecruitmentUserId = hrRecruitmentUser.id;
    hrRecruitmentToken = jwt.sign({ id: hrRecruitmentUserId }, JWT_SECRET, { expiresIn: '15m' });

    const noRoleUser = await prisma.user.create({
      data: {
        email: 'norole-wf@test.com',
        password: hashedPassword,
        isActive: true,
      },
    });
    noRoleUserId = noRoleUser.id;
    noRoleToken = jwt.sign({ id: noRoleUserId }, JWT_SECRET, { expiresIn: '15m' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ========== DEPARTMENT TESTS ==========

  describe('Departments', () => {
    it('should create a department (HEAD_OF_HR)', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ name: 'Engineering', code: 'ENG', description: 'Engineering department' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.department.name).toBe('Engineering');
      expect(res.body.data.department.code).toBe('ENG');
      testDepartmentId = res.body.data.department.id;
    });

    it('should reject duplicate department name', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ name: 'Engineering', code: 'ENG2' });
      expect(res.status).toBe(409);
    });

    it('should reject duplicate department code', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ name: 'Engineering 2', code: 'ENG' });
      expect(res.status).toBe(409);
    });

    it('should list departments', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.departments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
    });

    it('should get a department by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.department.id).toBe(testDepartmentId);
    });

    it('should update a department', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ description: 'Updated description' });
      expect(res.status).toBe(200);
      expect(res.body.data.department.description).toBe('Updated description');
    });

    it('should deny department creation without permission', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${noRoleToken}`)
        .send({ name: 'Test Dept', code: 'TD' });
      expect(res.status).toBe(403);
    });

    it('should allow HR_RECRUITMENT to read departments', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
    });

    it('should create a second department for later tests', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ name: 'Human Resources', code: 'HR' });
      expect(res.status).toBe(201);
    });
  });

  // ========== POSITION TESTS ==========

  describe('Positions', () => {
    it('should create a position (HEAD_OF_HR)', async () => {
      const res = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({
          title: 'Software Engineer',
          code: 'SWE-001',
          departmentId: testDepartmentId,
          description: 'Backend developer role',
          employmentType: 'FULL_TIME',
          salaryMin: 5000,
          salaryMax: 10000,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.position.title).toBe('Software Engineer');
      testPositionId = res.body.data.position.id;
    });

    it('should reject position with invalid department', async () => {
      const res = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({
          title: 'Ghost Position',
          code: 'GHOST-001',
          departmentId: 99999,
        });
      expect(res.status).toBe(404);
    });

    it('should reject duplicate position code', async () => {
      const res = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({
          title: 'Another Position',
          code: 'SWE-001',
          departmentId: testDepartmentId,
        });
      expect(res.status).toBe(409);
    });

    it('should reject salaryMax < salaryMin', async () => {
      const res = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({
          title: 'Bad Salary Position',
          code: 'BAD-001',
          departmentId: testDepartmentId,
          salaryMin: 10000,
          salaryMax: 5000,
        });
      expect(res.status).toBe(400);
    });

    it('should list positions', async () => {
      const res = await request(app)
        .get('/api/v1/positions')
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.positions.length).toBeGreaterThanOrEqual(1);
    });

    it('should list positions filtered by department', async () => {
      const res = await request(app)
        .get(`/api/v1/positions?departmentId=${testDepartmentId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.positions.length).toBeGreaterThanOrEqual(1);
    });

    it('should get a position by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/positions/${testPositionId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.position.department).toBeDefined();
    });

    it('should update a position', async () => {
      const res = await request(app)
        .put(`/api/v1/positions/${testPositionId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ description: 'Updated position description' });
      expect(res.status).toBe(200);
    });

    it('should deny position creation without permission', async () => {
      const res = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${noRoleToken}`)
        .send({ title: 'Test', code: 'TST', departmentId: testDepartmentId });
      expect(res.status).toBe(403);
    });
  });

  // ========== WORKFORCE REQUEST TESTS ==========

  describe('Workforce Requests', () => {

    // --- CRUD ---

    it('should create a workforce request (HR_RECRUITMENT)', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 3,
          justification: 'Team expansion for Q1 2027 projects',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workforceRequest.status).toBe('DRAFT');
      expect(res.body.data.workforceRequest.headcount).toBe(3);
      testWorkforceRequestId = res.body.data.workforceRequest.id;
    });

    it('should reject workforce request with invalid department', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: 99999,
          positionId: testPositionId,
          headcount: 1,
          justification: 'Test',
        });
      expect(res.status).toBe(404);
    });

    it('should reject workforce request with invalid position', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: 99999,
          headcount: 1,
          justification: 'Test',
        });
      expect(res.status).toBe(404);
    });

    it('should reject negative headcount via validation', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: -1,
          justification: 'Test',
        });
      expect(res.status).toBe(400);
    });

    it('should reject zero headcount via validation', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 0,
          justification: 'Test',
        });
      expect(res.status).toBe(400);
    });

    it('should deny workforce creation without permission', async () => {
      const res = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${noRoleToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'Test',
        });
      expect(res.status).toBe(403);
    });

    it('should list workforce requests', async () => {
      const res = await request(app)
        .get('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequests.length).toBeGreaterThanOrEqual(1);
    });

    it('should get a workforce request by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/workforce-requests/${testWorkforceRequestId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.department).toBeDefined();
      expect(res.body.data.workforceRequest.position).toBeDefined();
      expect(res.body.data.workforceRequest.requester).toBeDefined();
    });

    it('should update a DRAFT workforce request', async () => {
      const res = await request(app)
        .put(`/api/v1/workforce-requests/${testWorkforceRequestId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ headcount: 5, justification: 'Updated: larger team needed' });
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.headcount).toBe(5);
    });

    // --- WORKFLOW ---

    it('should submit a DRAFT workforce request', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.status).toBe('PENDING_APPROVAL');
    });

    it('should not allow editing a submitted request', async () => {
      const res = await request(app)
        .put(`/api/v1/workforce-requests/${testWorkforceRequestId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ headcount: 10 });
      expect(res.status).toBe(400);
    });

    it('should not allow re-submitting a submitted request', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(400);
    });

    it('should deny approval by non-HEAD_OF_HR', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/approve`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(403);
    });

    it('should deny rejection by non-HEAD_OF_HR', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/reject`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ rejectionReason: 'Not needed' });
      expect(res.status).toBe(403);
    });

    it('should approve a PENDING_APPROVAL request (HEAD_OF_HR)', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.status).toBe('APPROVED');
      expect(res.body.data.workforceRequest.approver).toBeDefined();
      expect(res.body.data.workforceRequest.approver.id).toBe(headOfHrUserId);
    });

    it('should not allow re-approval of approved request', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(400);
    });

    it('should not allow cancelling an approved request', async () => {
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${testWorkforceRequestId}/cancel`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(400);
    });

    // --- REJECTION WORKFLOW (new request) ---

    it('should reject a workforce request with reason (HEAD_OF_HR)', async () => {
      // Create a new request for rejection test
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 2,
          justification: 'Need more staff',
        });
      const rejectId = createRes.body.data.workforceRequest.id;

      // Submit it
      await request(app)
        .post(`/api/v1/workforce-requests/${rejectId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      // Reject it
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${rejectId}/reject`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ rejectionReason: 'Budget constraints for Q1' });
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.status).toBe('REJECTED');
      expect(res.body.data.workforceRequest.rejectionReason).toBe('Budget constraints for Q1');
      expect(res.body.data.workforceRequest.rejector.id).toBe(headOfHrUserId);
    });

    it('should require rejection reason', async () => {
      // Create and submit another request
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'Need more staff',
        });
      const reqId = createRes.body.data.workforceRequest.id;

      await request(app)
        .post(`/api/v1/workforce-requests/${reqId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      // Try to reject without reason
      const res = await request(app)
        .post(`/api/v1/workforce-requests/${reqId}/reject`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    // --- CANCEL WORKFLOW ---

    it('should cancel a DRAFT workforce request', async () => {
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'To be cancelled',
        });
      const cancelId = createRes.body.data.workforceRequest.id;

      const res = await request(app)
        .post(`/api/v1/workforce-requests/${cancelId}/cancel`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.status).toBe('CANCELLED');
    });

    it('should cancel a PENDING_APPROVAL workforce request', async () => {
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'To be cancelled after submit',
        });
      const cancelId = createRes.body.data.workforceRequest.id;

      await request(app)
        .post(`/api/v1/workforce-requests/${cancelId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      const res = await request(app)
        .post(`/api/v1/workforce-requests/${cancelId}/cancel`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workforceRequest.status).toBe('CANCELLED');
    });

    // --- DELETE ---

    it('should delete a DRAFT workforce request', async () => {
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'To be deleted',
        });
      const deleteId = createRes.body.data.workforceRequest.id;

      const res = await request(app)
        .delete(`/api/v1/workforce-requests/${deleteId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
    });

    it('should not delete a non-DRAFT workforce request', async () => {
      const createRes = await request(app)
        .post('/api/v1/workforce-requests')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          departmentId: testDepartmentId,
          positionId: testPositionId,
          headcount: 1,
          justification: 'Cannot delete after submit',
        });
      const reqId = createRes.body.data.workforceRequest.id;

      await request(app)
        .post(`/api/v1/workforce-requests/${reqId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      const res = await request(app)
        .delete(`/api/v1/workforce-requests/${reqId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ========== AUDIT LOG TESTS ==========

  describe('Audit Logs', () => {
    it('should have logged WORKFORCE_CREATED audit events', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'WORKFORCE_CREATED' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have logged WORKFORCE_SUBMITTED audit events', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'WORKFORCE_SUBMITTED' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have logged WORKFORCE_APPROVED audit events', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'WORKFORCE_APPROVED' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have logged WORKFORCE_REJECTED audit events', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'WORKFORCE_REJECTED' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ========== SAFE DELETE GUARD TESTS ==========

  describe('Safe Delete Guards', () => {
    it('should not delete a department that has positions', async () => {
      const res = await request(app)
        .delete(`/api/v1/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('positions');
    });

    it('should not delete a position that has workforce requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/positions/${testPositionId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('workforce requests');
    });

    it('should deny department delete by non-HEAD_OF_HR', async () => {
      const res = await request(app)
        .delete(`/api/v1/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(403);
    });
  });
});
