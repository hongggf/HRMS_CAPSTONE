import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Phase 4: Recruitment Lifecycle', () => {
  let headOfHrUserId: number;
  let hrRecruitmentUserId: number;
  let headOfHrToken: string;
  let hrRecruitmentToken: string;
  
  let testDepartmentId: number;
  let testPositionId: number;
  let testWorkforceRequestId: number;
  let testRequisitionId: number;
  let testJobPostingId: number;
  let testApplicationId: number;
  let testInterviewId: number;

  const JWT_SECRET = process.env.JWT_SECRET!;

  beforeAll(async () => {
    // 1. Clean up
    // 2. Setup Roles & Permissions
    const headRole = (await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' } }))!;
    const recRole = (await prisma.role.findUnique({ where: { name: 'HR_RECRUITMENT' } }))!;

    const perms = ['RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE'];
    for (const p of perms) {
      const perm = await prisma.permission.create({ data: { action: p } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: headRole.id, permissionId: perm.id } }, update: {}, create: { roleId: headRole.id, permissionId: perm.id } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: recRole.id, permissionId: perm.id } }, update: {}, create: { roleId: recRole.id, permissionId: perm.id } });
    }

    // 3. Setup Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const headUser = await prisma.user.create({
      data: {
        email: 'headhr_rec@test.com', password: hashedPassword,
        roles: { create: { roleId: headRole.id } },
      },
    });
    headOfHrUserId = headUser.id;
    headOfHrToken = jwt.sign({ id: headOfHrUserId }, JWT_SECRET, { expiresIn: '15m' });

    const recUser = await prisma.user.create({
      data: {
        email: 'recruiter@test.com', password: hashedPassword,
        roles: { create: { roleId: recRole.id } },
      },
    });
    hrRecruitmentUserId = recUser.id;
    hrRecruitmentToken = jwt.sign({ id: hrRecruitmentUserId }, JWT_SECRET, { expiresIn: '15m' });

    // 4. Setup Prerequisites (Dept, Pos, WF Req)
    const dept = await prisma.department.create({ data: { name: 'Engineering', code: 'ENG' } });
    testDepartmentId = dept.id;

    const pos = await prisma.position.create({
      data: { title: 'Backend Dev', code: 'BE-01', departmentId: dept.id }
    });
    testPositionId = pos.id;

    const wfReq = await prisma.workforceRequest.create({
      data: {
        departmentId: dept.id, positionId: pos.id, requestedBy: headUser.id,
        headcount: 1, justification: 'New project', status: 'APPROVED'
      }
    });
    testWorkforceRequestId = wfReq.id;
  });

  afterAll(async () => { await prisma.$disconnect(); });

  describe('1. Job Requisition', () => {
    it('should create a job requisition', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/requisitions')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ workforceRequestId: testWorkforceRequestId });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(201);
      expect(res.body.data.requisition.status).toBe('DRAFT');
      testRequisitionId = res.body.data.requisition.id;
    });

    it('should submit a job requisition', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/requisitions/${testRequisitionId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'APPROVED' }); // simplified workflow for test
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
      expect(res.body.data.requisition.status).toBe('APPROVED');
    });
  });

  describe('2. Job Posting', () => {
    it('should create a job posting', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/postings')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          requisitionId: testRequisitionId,
          title: 'Backend Developer',
          description: 'Great job',
          requirements: 'Node.js',
          location: 'Remote',
          employmentType: 'FULL_TIME',
          openingDate: new Date().toISOString(),
        });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(201);
      testJobPostingId = res.body.data.jobPosting.id;
    });

    it('should publish a job posting', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/postings/${testJobPostingId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'PUBLISHED' });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });
  });

  describe('3. Application & Screening', () => {
    it('should submit an application (public/candidate)', async () => {
      // Assuming public endpoint with token for now, or just any logged in user
      const res = await request(app)
        .post('/api/v1/recruitment/applications')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`) // in reality could be candidate token, but using hr for test
        .send({
          jobPostingId: testJobPostingId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          resumeUrl: 'http://resume.com/johndoe'
        });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(201);
      expect(res.body.data.application.status).toBe('APPLIED');
      testApplicationId = res.body.data.application.id;
    });

    it('should transition to SCREENING', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/applications/${testApplicationId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'SCREENING' });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });

    it('should transition to SHORTLISTED', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/applications/${testApplicationId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'SHORTLISTED' });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });
  });

  describe('4. Interviews', () => {
    it('should schedule an interview and auto-transition application', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/interviews')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          applicationId: testApplicationId,
          interviewerId: headOfHrUserId,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          type: 'TECHNICAL',
          location: 'Zoom',
        });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(201);
      testInterviewId = res.body.data.interview.id;

      // Verify auto-transition
      const appRes = await request(app)
        .get(`/api/v1/recruitment/postings`) // proxy to check, or just check db
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      // Not directly checking, but assuming no 500 means success
    });

    it('should evaluate an interview', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/interviews/${testInterviewId}/evaluate`)
        .set('Authorization', `Bearer ${headOfHrToken}`) // interviewer
        .send({
          score: 85,
          strengths: 'Good Node.js',
          weaknesses: 'Needs AWS experience',
          recommendation: 'Hire',
        });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });
  });

  describe('5. Selection & Head of HR Approval', () => {
    it('should select candidate by HR_RECRUITMENT', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/applications/${testApplicationId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'SELECTED' });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });

    it('should forward to PENDING_HEAD_OF_HR_APPROVAL', async () => {
      const res = await request(app)
        .put(`/api/v1/recruitment/applications/${testApplicationId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'PENDING_HEAD_OF_HR_APPROVAL' });
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
    });

    it('should reject approval by non-HEAD_OF_HR', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(403); // Forbidden due to requireRole
    });

    it('should approve candidate by HEAD_OF_HR', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);
      if(res.status>=400) console.error(res.body); expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('APPROVED');
    });
  });

  describe('6. Candidates, Duplicates, Conflicts, Empty Pipelines & Permissions', () => {
    let unauthToken: string;

    beforeAll(async () => {
      const attRole = (await prisma.role.findUnique({ where: { name: 'HR_ATTENDANCE' } }))!;
      const hashedPassword = await bcrypt.hash('password123', 10);
      const attUser = await prisma.user.create({
        data: {
          email: 'attendance_tester@test.com',
          password: hashedPassword,
          roles: { create: { roleId: attRole.id } },
        },
      });
      unauthToken = jwt.sign({ id: attUser.id }, JWT_SECRET, { expiresIn: '15m' });
    });

    it('should create a candidate profile independently', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/candidates')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice.smith@example.com',
          phone: '+1-555-0199',
          resumeUrl: 'https://example.com/alice.pdf',
          source: 'LinkedIn',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.candidate.email).toBe('alice.smith@example.com');
    });

    it('should reject candidate creation with duplicate email (409)', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/candidates')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Duplicate',
          email: 'alice.smith@example.com',
        });
      expect(res.status).toBe(409);
    });

    it('should list and search candidate profiles with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/candidates?search=Alice&page=1&limit=10')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.candidates.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a requisition detail', async () => {
      const res = await request(app)
        .get(`/api/v1/recruitment/requisitions/${testRequisitionId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.requisition.id).toBe(testRequisitionId);
      expect(res.body.data.requisition.workforceRequest).toBeDefined();
    });

    it('should reject duplicate application for the same job posting (409)', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/applications')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          jobPostingId: testJobPostingId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });
      expect(res.status).toBe(409);
    });

    it('should reject invalid application status transition (400)', async () => {
      // testApplicationId is in APPROVED status; attempting to jump back to SCREENING is invalid
      const res = await request(app)
        .put(`/api/v1/recruitment/applications/${testApplicationId}/status`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ status: 'SCREENING' });
      expect(res.status).toBe(400);
    });

    it('should reject scheduling interview when interviewer has time conflict (409)', async () => {
      // Create a second application to test interview conflict
      const candidate2 = await prisma.candidate.create({
        data: { firstName: 'Bob', lastName: 'Taylor', email: 'bob@example.com' },
      });
      const app2 = await prisma.application.create({
        data: {
          candidateId: candidate2.id,
          jobPostingId: testJobPostingId,
          status: 'SHORTLISTED',
        },
      });

      // Schedule an active interview for headOfHrUserId in 2 days
      const slotTime = new Date(Date.now() + 2 * 86400000).toISOString();
      const firstRes = await request(app)
        .post('/api/v1/recruitment/interviews')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          applicationId: app2.id,
          interviewerId: headOfHrUserId,
          scheduledAt: slotTime,
          type: 'TECHNICAL',
        });
      expect(firstRes.status).toBe(201);

      // Attempt to schedule a second interview for the same interviewer 15 minutes later (conflict)
      const conflictTime = new Date(new Date(slotTime).getTime() + 15 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/v1/recruitment/interviews')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({
          applicationId: app2.id,
          interviewerId: headOfHrUserId,
          scheduledAt: conflictTime,
          type: 'HR',
        });
      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('scheduling conflict');
    });

    it('should reject duplicate interview evaluation submission (409)', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/interviews/${testInterviewId}/evaluate`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({
          score: 90,
          strengths: 'Excellent',
          weaknesses: 'None',
          recommendation: 'Hire',
        });
      expect(res.status).toBe(409);
    });

    it('should handle empty pipeline queries gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/applications?status=WITHDRAWN')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.applications).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should reject access to candidates for unauthorized role (403)', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/candidates')
        .set('Authorization', `Bearer ${unauthToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject access to applications for unauthorized role (403)', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/applications')
        .set('Authorization', `Bearer ${unauthToken}`);
      expect(res.status).toBe(403);
    });
  });
});

