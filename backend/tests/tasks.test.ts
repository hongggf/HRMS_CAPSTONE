import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Tasks & Approvals API', () => {
  let headOfHrUserId: number;
  let hrRecruitmentUserId: number;
  let headOfHrToken: string;
  let hrRecruitmentToken: string;
  let departmentId: number;
  let positionId: number;
  let draftRequestId: number;
  let pendingRequestId: number;

  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

  beforeAll(async () => {
    // 1. Roles
    const headRole = await prisma.role.upsert({
      where: { name: 'HEAD_OF_HR' },
      update: {},
      create: { name: 'HEAD_OF_HR' },
    });

    const recruitmentRole = await prisma.role.upsert({
      where: { name: 'HR_RECRUITMENT' },
      update: {},
      create: { name: 'HR_RECRUITMENT' },
    });

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Users
    const headUser = await prisma.user.upsert({
      where: { email: 'head_tasks_test@hr.local' },
      update: {},
      create: {
        email: 'head_tasks_test@hr.local',
        password: hashedPassword,
        isActive: true,
        roles: { create: { roleId: headRole.id } },
      },
    });
    headOfHrUserId = headUser.id;
    headOfHrToken = jwt.sign({ id: headOfHrUserId }, JWT_SECRET, { expiresIn: '15m' });

    const hrUser = await prisma.user.upsert({
      where: { email: 'recruiter_tasks_test@hr.local' },
      update: {},
      create: {
        email: 'recruiter_tasks_test@hr.local',
        password: hashedPassword,
        isActive: true,
        roles: { create: { roleId: recruitmentRole.id } },
      },
    });
    hrRecruitmentUserId = hrUser.id;
    hrRecruitmentToken = jwt.sign({ id: hrRecruitmentUserId }, JWT_SECRET, { expiresIn: '15m' });

    // 3. Department & Position
    const dept = await prisma.department.upsert({
      where: { code: 'TASK_TEST_DEPT' },
      update: {},
      create: {
        name: 'Task Testing Dept',
        code: 'TASK_TEST_DEPT',
      },
    });
    departmentId = dept.id;

    const pos = await prisma.position.upsert({
      where: { code: 'TASK_TEST_POS' },
      update: {},
      create: {
        title: 'Task Test Engineer',
        code: 'TASK_TEST_POS',
        departmentId: dept.id,
      },
    });
    positionId = pos.id;

    // 4. Sample requests
    const draftReq = await prisma.workforceRequest.create({
      data: {
        departmentId: dept.id,
        positionId: pos.id,
        requestedBy: hrRecruitmentUserId,
        headcount: 2,
        justification: 'Draft task for testing',
        status: 'DRAFT',
      },
    });
    draftRequestId = draftReq.id;

    const pendingReq = await prisma.workforceRequest.create({
      data: {
        departmentId: dept.id,
        positionId: pos.id,
        requestedBy: hrRecruitmentUserId,
        headcount: 3,
        justification: 'Pending task awaiting Head of HR',
        status: 'PENDING_APPROVAL',
      },
    });
    pendingRequestId = pendingReq.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/tasks', () => {
    it('HEAD_OF_HR should see all tasks across the system', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${headOfHrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalTasks).toBeGreaterThanOrEqual(2);
    });

    it('Other HR role should only see their own tasks', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const allTasks = res.body.data.tasks;
      for (const t of allTasks) {
        expect(t.requestedBy).toBe(hrRecruitmentUserId);
      }
    });

    it('should filter tasks by status=PENDING_APPROVAL', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?status=PENDING_APPROVAL')
        .set('Authorization', `Bearer ${headOfHrToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data.tasks) {
        expect(t.status).toBe('PENDING_APPROVAL');
      }
    });
  });

  describe('POST /api/v1/tasks/:type/:id/submit', () => {
    it('HR role can submit their own draft task for approval', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${draftRequestId}/submit`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.status).toBe('PENDING_APPROVAL');

      // Verify Head of HR received a notification
      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: headOfHrUserId,
          entityId: `WORKFORCE_PLANNING-${draftRequestId}`,
        },
      });
      expect(notif).toBeDefined();
    });
  });

  describe('Role-Based Approval & Rejection Protections', () => {
    it('Non-HEAD_OF_HR CANNOT approve tasks (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingRequestId}/approve`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(403);
    });

    it('Non-HEAD_OF_HR CANNOT reject tasks (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`)
        .send({ rejectionReason: 'Not approved' });

      expect(res.status).toBe(403);
    });

    it('HEAD_OF_HR requires rejectionReason to reject (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('HEAD_OF_HR can reject a pending task with reason', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${headOfHrToken}`)
        .send({ rejectionReason: 'Budget exceeded for Q4' });

      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('REJECTED');
      expect(res.body.data.task.rejectionReason).toBe('Budget exceeded for Q4');

      // Verify notification sent to requester
      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: hrRecruitmentUserId,
          entityId: `WORKFORCE_PLANNING-${pendingRequestId}`,
          title: '❌ Task Rejected',
        },
      });
      expect(notif).toBeDefined();
    });

    it('HEAD_OF_HR can approve a pending task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${draftRequestId}/approve`)
        .set('Authorization', `Bearer ${headOfHrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('APPROVED');

      // Verify notification sent to requester
      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: hrRecruitmentUserId,
          entityId: `WORKFORCE_PLANNING-${draftRequestId}`,
          title: '✅ Task Approved',
        },
      });
      expect(notif).toBeDefined();
    });
  });

  describe('Draft Deletion Protections', () => {
    let newDraftId: number;

    beforeAll(async () => {
      const d = await prisma.workforceRequest.create({
        data: {
          departmentId,
          positionId,
          requestedBy: hrRecruitmentUserId,
          headcount: 1,
          justification: 'Draft for delete test',
          status: 'DRAFT',
        },
      });
      newDraftId = d.id;
    });

    it('HR role can delete their own draft task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/WORKFORCE_PLANNING/${newDraftId}`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await prisma.workforceRequest.findUnique({ where: { id: newDraftId } });
      expect(check).toBeNull();
    });

    it('Cannot delete an APPROVED task (400 Bad Request)', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/WORKFORCE_PLANNING/${draftRequestId}`)
        .set('Authorization', `Bearer ${headOfHrToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Task Follow-Up & Notification Alerting', () => {
    let pendingFollowUpId: number;

    beforeAll(async () => {
      const req = await prisma.workforceRequest.create({
        data: {
          departmentId,
          positionId,
          requestedBy: hrRecruitmentUserId,
          headcount: 4,
          justification: 'Urgent expansion needing follow up',
          status: 'PENDING_APPROVAL',
        },
      });
      pendingFollowUpId = req.id;
    });

    it('HR role can follow up on a pending task, sending alert to Head of HR', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingFollowUpId}/follow-up`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Follow-up notification sent to Head of HR');

      // Verify Head of HR received the ALERT notification
      const alertNotif = await prisma.notification.findFirst({
        where: {
          recipientId: headOfHrUserId,
          entityId: `WORKFORCE_PLANNING-${pendingFollowUpId}`,
          type: 'ALERT',
        },
      });
      expect(alertNotif).toBeDefined();
      expect(alertNotif?.title).toContain('Urgent Follow-Up');
    });

    it('Immediate second follow-up triggers cooldown rate limit (429 Too Many Requests)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/WORKFORCE_PLANNING/${pendingFollowUpId}/follow-up`)
        .set('Authorization', `Bearer ${hrRecruitmentToken}`);

      expect(res.status).toBe(429);
      expect(res.body.error.message).toContain('already sent recently');
    });
  });
});
