import request from 'supertest';
import app from '../src/app';
import { PrismaClient, EmployeeStatus, OnboardingStatus, ApplicationStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 5: Employee & Onboarding Integration Tests', () => {
  let hrAdminToken: string;
  let noRoleToken: string;
  let testDepartment: any;
  let testPosition: any;
  let testPosition2: any;
  let hrAdminId: number;
  let noRoleId: number;
  let approvedAppId: number;
  let unapprovedAppId: number;
  let testPostingId: number;
  let createdEmployeeId: number;

  beforeAll(async () => {
    // Clear relevant tables
    const perms = ['EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_ACTIVATE', 'DOCUMENT_UPLOAD'];
    for (const p of perms) {
      await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
    }

    const hrRole = await prisma.role.create({
      data: {
        name: 'HR_ADMIN_PHASE5',
        permissions: {
          create: perms.map(p => ({ permission: { connectOrCreate: { where: { action: p }, create: { action: p } } } }))
        }
      }
    });

    const hrUser = await prisma.user.create({
      data: { email: 'hr_p5@test.local', password: 'hash', roles: { create: { roleId: hrRole.id } } }
    });
    hrAdminId = hrUser.id;
    hrAdminToken = generateToken(hrUser.id, '15m');

    const noRoleUser = await prisma.user.create({
      data: { email: 'norole_p5@test.local', password: 'hash' }
    });
    noRoleId = noRoleUser.id;
    noRoleToken = generateToken(noRoleUser.id, '15m');

    testDepartment = await prisma.department.create({ data: { name: 'Engineering', code: 'ENG_P5' } });
    testPosition = await prisma.position.create({ data: { title: 'Engineer', code: 'E1_P5', departmentId: testDepartment.id } });
    testPosition2 = await prisma.position.create({ data: { title: 'Senior Engineer', code: 'E2_P5', departmentId: testDepartment.id } });

    const c1 = await prisma.candidate.create({ data: { firstName: 'Appr', lastName: 'Oved', email: 'a@c.com' } });
    const c2 = await prisma.candidate.create({ data: { firstName: 'Unap', lastName: 'Proved', email: 'u@c.com' } });

    const wf = await prisma.workforceRequest.create({ data: { departmentId: testDepartment.id, positionId: testPosition.id, requestedBy: hrAdminId, headcount: 2, justification: 'J' } });
    const req = await prisma.jobRequisition.create({ data: { workforceRequestId: wf.id, requestedBy: hrAdminId } });
    testPostingId = (await prisma.jobPosting.create({ data: { requisitionId: req.id, title: 'Eng', description: 'Desc', requirements: 'Req', location: 'Loc', employmentType: 'FULL_TIME', openingDate: new Date() } })).id;
    const posting = { id: testPostingId };
// data: { requisitionId: req.id, title: 'Eng', description: 'Desc', requirements: 'Req', location: 'Loc', employmentType: 'FULL_TIME', openingDate: new Date() } });

    const app1 = await prisma.application.create({ data: { candidateId: c1.id, jobPostingId: posting.id, status: ApplicationStatus.APPROVED } });
    approvedAppId = app1.id;

    const app2 = await prisma.application.create({ data: { candidateId: c2.id, jobPostingId: posting.id, status: ApplicationStatus.APPLIED } });
    unapprovedAppId = app2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('unauthorized HR role rejected', async () => {
    const res = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${noRoleToken}`).send({});
    expect(res.status).toBe(403);
  });

  it('unapproved candidate cannot onboard', async () => {
    const res = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${hrAdminToken}`).send({
      applicationId: unapprovedAppId,
      employeeId: 'EMP_NO',
      firstName: 'F',
      lastName: 'L',
      email: 'a@b.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Only a candidate approved by HEAD_OF_HR can become an employee.');
  });

  it('approved candidate can onboard', async () => {
    const res = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${hrAdminToken}`).send({
      applicationId: (await prisma.application.create({ data: { candidateId: (await prisma.candidate.create({ data: { firstName: 'D', lastName: 'U', email: Math.random() + '@c.com' } })).id, jobPostingId: testPostingId, status: 'APPROVED' } })).id,
      employeeId: 'EMP_001',
      firstName: 'Appr',
      lastName: 'Oved',
      email: 'emp1@c.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id
    });
    expect(res.status).toBe(201);
    expect(res.body.employeeId).toBe('EMP_001');
    createdEmployeeId = res.body.id;
  });

  it('duplicate employee ID rejected', async () => {
    const res = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${hrAdminToken}`).send({
      applicationId: (await prisma.application.create({ data: { candidateId: (await prisma.candidate.create({ data: { firstName: 'D', lastName: 'U', email: Math.random() + '@c.com' } })).id, jobPostingId: testPostingId, status: 'APPROVED' } })).id,
      employeeId: 'EMP_001',
      firstName: 'Dup',
      lastName: 'Li',
      email: 'dup@c.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Employee ID must be unique.');
  });

  it('activation fails if incomplete documents', async () => {
    // Complete onboarding first to satisfy that requirement for testing this branch
    await prisma.employee.update({ where: { id: createdEmployeeId }, data: { onboardingStatus: OnboardingStatus.PROFILE_COMPLETED } });
    
    const res = await request(app).post(`/api/v1/employees/${createdEmployeeId}/activate`).set('Authorization', `Bearer ${hrAdminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Onboarding incomplete');
  });

  it('onboarding completion and activation', async () => {
    // 1. Upload Doc
    await request(app).post(`/api/v1/employees/${createdEmployeeId}/documents`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .attach('file', Buffer.from('hello'), 'id.pdf')
      .field('documentType', 'ID');
    
    // 2. Complete Onboarding
    await request(app).post(`/api/v1/employees/${createdEmployeeId}/onboarding/complete`)
      .set('Authorization', `Bearer ${hrAdminToken}`);

    // 3. Activate
    const res = await request(app).post(`/api/v1/employees/${createdEmployeeId}/activate`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(EmployeeStatus.ACTIVE);
  });

  it('position history', async () => {
    const res = await request(app).put(`/api/v1/employees/${createdEmployeeId}/position`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ positionId: testPosition2.id });
    
    expect(res.status).toBe(200);

    const emp = await prisma.employee.findUnique({ where: { id: createdEmployeeId }, include: { positionHistory: true } });
    expect(emp?.positionHistory.length).toBe(2);
    expect(emp?.positionHistory[0].endDate).not.toBeNull();
    expect(emp?.positionHistory[1].positionId).toBe(testPosition2.id);
    expect(emp?.positionHistory[1].endDate).toBeNull();
  });
});
