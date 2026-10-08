import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 10: Learning & Development Integration Tests', () => {
  let hrLndToken: string;
  let hrLndUserId: number;
  let empId1: number;
  let categoryId: number;
  let trainingId: number;
  let sessionId: number;

  beforeAll(async () => {
    // Basic setup
    const hrLndRole = await prisma.role.upsert({ where: { name: 'HR_LND' }, update: {}, create: { name: 'HR_LND' } });
    const perms = ['LND_CREATE', 'LND_READ', 'LND_UPDATE'];
    for (const p of perms) {
      const perm = await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: hrLndRole.id, permissionId: perm.id } },
        update: {}, create: { roleId: hrLndRole.id, permissionId: perm.id }
      });
    }

    const hrLndUser = await prisma.user.create({
      data: {
        email: 'lnd.test@example.com',
        password: 'hashed',
        roles: { create: { roleId: hrLndRole.id } }
      }
    });
    hrLndUserId = hrLndUser.id;
    hrLndToken = generateToken(hrLndUser.id, '1h');

    const dep = await prisma.department.create({ data: { code: 'LND_DEP', name: 'LND Department' } });
    const pos = await prisma.position.create({ data: { code: 'LND_POS', title: 'LND Position', departmentId: dep.id } });
    
    const empUser = await prisma.user.create({
      data: { email: 'emp.lnd@example.com', password: 'hashed' }
    });
    
    const emp = await prisma.employee.create({
      data: {
        userId: empUser.id,
        employeeId: 'LND-001',
        firstName: 'LND',
        lastName: 'Employee',
        email: 'emp.lnd@example.com',
        departmentId: dep.id,
        positionId: pos.id,
        status: 'ACTIVE',
        hireDate: new Date()
      }
    });
    empId1 = emp.id;
  });

  afterAll(async () => {
    await prisma.employeeSkill.deleteMany();
    await prisma.trainingEvaluation.deleteMany();
    await prisma.trainingAttendance.deleteMany();
    await prisma.trainingSession.deleteMany();
    await prisma.trainingAssignment.deleteMany();
    await prisma.trainingPlan.deleteMany();
    await prisma.training.deleteMany();
    await prisma.trainingCategory.deleteMany();
    
    await prisma.employee.deleteMany({ where: { employeeId: 'LND-001' } });
    await prisma.user.deleteMany({ where: { email: { in: ['lnd.test@example.com', 'emp.lnd@example.com'] } } });
    await prisma.position.deleteMany({ where: { code: 'LND_POS' } });
    await prisma.department.deleteMany({ where: { code: 'LND_DEP' } });
  });

  it('LND-001 Create training category', async () => {
    const res = await request(app)
      .post('/api/v1/lnd/categories')
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        name: 'Technical Skills',
        description: 'Software development training'
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Technical Skills');
    categoryId = res.body.id;
  });

  it('LND-002 Create training', async () => {
    const res = await request(app)
      .post('/api/v1/lnd/trainings')
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        title: 'Advanced React',
        description: 'Deep dive into React hooks',
        categoryId,
        type: 'ONLINE',
        capacity: 50
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Advanced React');
    trainingId = res.body.id;
  });

  it('LND-003 Create training plan', async () => {
    const res = await request(app)
      .post('/api/v1/lnd/plans')
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        trainingId,
        identifiedNeed: 'React skills gap',
        objective: 'Improve frontend dev speed'
      });
    expect(res.status).toBe(201);
    expect(res.body.identifiedNeed).toBe('React skills gap');
  });

  it('LND-004 Assign employee to training', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/trainings/${trainingId}/assignments`)
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        employeeIds: [empId1]
      });
    expect(res.status).toBe(201);
  });

  it('LND-005 Create training session', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/trainings/${trainingId}/sessions`)
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        title: 'React Hooks Deep Dive',
        date: new Date().toISOString()
      });
    expect(res.status).toBe(201);
    sessionId = res.body.id;
  });

  it('LND-006 Mark attendance', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        employeeId: empId1,
        status: 'ATTENDED'
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ATTENDED');
  });

  it('LND-007 Submit training evaluation', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/trainings/${trainingId}/evaluations`)
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        evaluatorId: empId1,
        rating: 5,
        feedback: 'Great course'
      });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
  });

  it('LND-008 Add employee skill', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/employees/${empId1}/skills`)
      .set('Authorization', `Bearer ${hrLndToken}`)
      .send({
        skillName: 'React',
        level: 'ADVANCED'
      });
    expect(res.status).toBe(200);
    expect(res.body.skillName).toBe('React');
    expect(res.body.level).toBe('ADVANCED');
  });
});
