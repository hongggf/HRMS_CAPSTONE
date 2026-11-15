import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';

describe('Phase 3: Employee Learning & Development Security & Self-Service Tests', () => {
  let hrLndToken: string;
  let employee1Token: string;
  let employee2Token: string;
  let employee1Id: number;
  let employee2Id: number;
  let categoryId: number;
  let training1Id: number;
  let training2Id: number;
  let session1Id: number;

  beforeAll(async () => {
    // 1. Roles & Permissions setup
    const lndPerms = ['LND_CREATE', 'LND_READ', 'LND_UPDATE', 'EMPLOYEE_READ'];
    for (const action of lndPerms) {
      await prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      });
    }

    const hrLndRole = await prisma.role.upsert({
      where: { name: 'HR_LND' },
      update: {},
      create: { name: 'HR_LND' },
    });

    const employeeRole = await prisma.role.upsert({
      where: { name: 'EMPLOYEE' },
      update: {},
      create: { name: 'EMPLOYEE' },
    });

    for (const action of lndPerms) {
      const p = await prisma.permission.findUnique({ where: { action } });
      if (p) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: hrLndRole.id, permissionId: p.id } },
          update: {},
          create: { roleId: hrLndRole.id, permissionId: p.id },
        });
      }
    }

    // 2. Department & Position
    const suffix = Date.now().toString().slice(-4);
    const dept = await prisma.department.create({
      data: { name: `LND_Dept_${suffix}`, code: `LND_${suffix}` },
    });
    const pos = await prisma.position.create({
      data: { title: `Engineer_${suffix}`, code: `ENG_${suffix}`, departmentId: dept.id },
    });

    // 3. Create HR_LND User
    const hashedHrPass = await bcrypt.hash('Password123!', 10);
    const hrUser = await prisma.user.create({
      data: {
        email: `hr_lnd_${suffix}@company.com`,
        password: hashedHrPass,
        isActive: true,
        roles: { create: { roleId: hrLndRole.id } },
      },
    });

    const hrLogin = await request(app).post('/api/v1/auth/login').send({
      email: hrUser.email,
      password: 'Password123!',
    });
    hrLndToken = hrLogin.body.data.accessToken;

    // 4. Create Employee 1 (Alice)
    const emp1Pass = await bcrypt.hash('EmpPass123!', 10);
    const emp1User = await prisma.user.create({
      data: {
        email: `alice_${suffix}@company.com`,
        password: emp1Pass,
        isActive: true,
        roles: { create: { roleId: employeeRole.id } },
      },
    });

    const emp1 = await prisma.employee.create({
      data: {
        employeeId: `EMP-${suffix}1`,
        firstName: 'Alice',
        lastName: 'Developer',
        email: emp1User.email,
        departmentId: dept.id,
        positionId: pos.id,
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE',
        userId: emp1User.id,
      },
    });
    employee1Id = emp1.id;

    const emp1Login = await request(app).post('/api/v1/auth/login').send({
      email: emp1User.email,
      password: 'EmpPass123!',
    });
    employee1Token = emp1Login.body.data.accessToken;

    // 5. Create Employee 2 (Bob)
    const emp2Pass = await bcrypt.hash('EmpPass123!', 10);
    const emp2User = await prisma.user.create({
      data: {
        email: `bob_${suffix}@company.com`,
        password: emp2Pass,
        isActive: true,
        roles: { create: { roleId: employeeRole.id } },
      },
    });

    const emp2 = await prisma.employee.create({
      data: {
        employeeId: `EMP-${suffix}2`,
        firstName: 'Bob',
        lastName: 'Tester',
        email: emp2User.email,
        departmentId: dept.id,
        positionId: pos.id,
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE',
        userId: emp2User.id,
      },
    });
    employee2Id = emp2.id;

    const emp2Login = await request(app).post('/api/v1/auth/login').send({
      email: emp2User.email,
      password: 'EmpPass123!',
    });
    employee2Token = emp2Login.body.data.accessToken;

    // 6. Setup Category, Trainings & Sessions
    const cat = await prisma.trainingCategory.create({
      data: { name: `Cloud Architecture_${suffix}`, description: 'Cloud & Infrastructure' },
    });
    categoryId = cat.id;

    const t1 = await prisma.training.create({
      data: {
        title: `Kubernetes Fundamentals_${suffix}`,
        description: 'Hands-on container orchestration masterclass',
        categoryId: cat.id,
        provider: 'Cloud Native Foundation',
        type: 'ONLINE',
        capacity: 25,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 86400000),
      },
    });
    training1Id = t1.id;

    const t2 = await prisma.training.create({
      data: {
        title: `Advanced Microservices_${suffix}`,
        description: 'Distributed systems and event streaming',
        categoryId: cat.id,
        provider: 'Architecture Guild',
        type: 'CLASSROOM',
        capacity: 10,
        status: 'ACTIVE',
      },
    });
    training2Id = t2.id;

    // Create session for Training 1
    const s1 = await prisma.trainingSession.create({
      data: {
        trainingId: t1.id,
        title: 'Session 1: Pods, Services & Ingress',
        date: new Date(Date.now() + 2 * 86400000),
        location: 'Virtual Classroom 1',
      },
    });
    session1Id = s1.id;

    // Assign Employee 1 (Alice) to Training 1
    await prisma.trainingAssignment.create({
      data: {
        trainingId: t1.id,
        employeeId: employee1Id,
      },
    });

    // Register attendance for Employee 1 in Session 1
    await prisma.trainingAttendance.create({
      data: {
        sessionId: s1.id,
        employeeId: employee1Id,
        status: 'REGISTERED',
      },
    });

    // Add a verified skill for Alice
    await prisma.employeeSkill.create({
      data: {
        employeeId: employee1Id,
        skillName: 'Docker Containerization',
        level: 'INTERMEDIATE',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Employee A can fetch their personalized learning dashboard
  it('Employee A securely accesses their assigned trainings, upcoming sessions, and skills', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me/learning')
      .set('Authorization', `Bearer ${employee1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee.id).toBe(employee1Id);

    // Verify assigned trainings
    expect(res.body.data.assignedTrainings.length).toBe(1);
    expect(res.body.data.assignedTrainings[0].trainingId).toBe(training1Id);
    expect(res.body.data.assignedTrainings[0].title).toContain('Kubernetes Fundamentals');
    expect(res.body.data.assignedTrainings[0].sessions.length).toBe(1);
    expect(res.body.data.assignedTrainings[0].sessions[0].attendanceStatus).toBe('REGISTERED');

    // Verify upcoming sessions
    expect(res.body.data.upcomingSessions.length).toBe(1);
    expect(res.body.data.upcomingSessions[0].id).toBe(session1Id);

    // Verify skills
    expect(res.body.data.skills.some((s: any) => s.skillName === 'Docker Containerization')).toBe(true);

    // Verify available trainings includes Training 2 (not yet enrolled)
    expect(res.body.data.availableTrainings.some((t: any) => t.id === training2Id)).toBe(true);
    // Training 1 must NOT be in availableTrainings since already enrolled
    expect(res.body.data.availableTrainings.some((t: any) => t.id === training1Id)).toBe(false);
  });

  // Test 2: Employee B does NOT see Employee A's assignments
  it('Employee B sees zero assigned trainings when none assigned to them', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me/learning')
      .set('Authorization', `Bearer ${employee2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.employee.id).toBe(employee2Id);
    expect(res.body.data.assignedTrainings.length).toBe(0);
    expect(res.body.data.upcomingSessions.length).toBe(0);
    expect(res.body.data.skills.length).toBe(0);

    // Both Training 1 and Training 2 should be in availableTrainings for Bob
    expect(res.body.data.availableTrainings.some((t: any) => t.id === training1Id)).toBe(true);
    expect(res.body.data.availableTrainings.some((t: any) => t.id === training2Id)).toBe(true);
  });

  // Test 3: Employee self-enrollment
  it('Employee B can browse and enroll into an available training course', async () => {
    const res = await request(app)
      .post(`/api/v1/lnd/trainings/${training2Id}/join`)
      .set('Authorization', `Bearer ${employee2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Successfully joined');

    // Verify Employee B now has it in assigned trainings
    const learningRes = await request(app)
      .get('/api/v1/employees/me/learning')
      .set('Authorization', `Bearer ${employee2Token}`);

    expect(learningRes.body.data.assignedTrainings.some((t: any) => t.trainingId === training2Id)).toBe(true);
  });

  // Test 4: Course Evaluation - Enrolled employee can evaluate course
  it('Enrolled employee can submit course evaluation and rating', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/me/trainings/${training1Id}/evaluation`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        rating: 5,
        feedback: 'Exceptional hands-on labs and clear instructor delivery.',
        comments: 'Highly recommended for backend engineers.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.evaluatorId).toBe(employee1Id);

    // Verify evaluation appears on my learning endpoint
    const learningRes = await request(app)
      .get('/api/v1/employees/me/learning')
      .set('Authorization', `Bearer ${employee1Token}`);

    const t1Data = learningRes.body.data.assignedTrainings.find((t: any) => t.trainingId === training1Id);
    expect(t1Data.evaluation).toBeDefined();
    expect(t1Data.evaluation.rating).toBe(5);
  });

  // Test 5: Rejection of duplicate evaluation
  it('Prevents employee from submitting duplicate evaluation for the same course', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/me/trainings/${training1Id}/evaluation`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        rating: 4,
        feedback: 'Attempting duplicate evaluation.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already submitted an evaluation');
  });

  // Test 6: Non-enrolled employee cannot evaluate course
  it('Blocks employee from evaluating a course they are not enrolled in (403 Forbidden)', async () => {
    // Bob is not enrolled in Training 1
    const res = await request(app)
      .post(`/api/v1/employees/me/trainings/${training1Id}/evaluation`)
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        rating: 1,
        feedback: 'I did not attend this course.',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not enrolled in this training course');
  });

  // Test 7: Strict RBAC - Employees cannot create training categories or plans
  it('Strictly forbids EMPLOYEE role from HR administrative L&D mutations (403 Forbidden)', async () => {
    // 1. Cannot create category
    const catRes = await request(app)
      .post('/api/v1/lnd/categories')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({ name: 'Hacked Category' });
    expect(catRes.status).toBe(403);

    // 2. Cannot create training
    const trainRes = await request(app)
      .post('/api/v1/lnd/trainings')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        title: 'Unauthorized Training',
        categoryId,
        type: 'ONLINE',
      });
    expect(trainRes.status).toBe(403);

    // 3. Cannot create training plan
    const planRes = await request(app)
      .post('/api/v1/lnd/plans')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        trainingId: training1Id,
        identifiedNeed: 'Need',
        objective: 'Objective',
      });
    expect(planRes.status).toBe(403);

    // 4. Cannot verify or update skills
    const skillRes = await request(app)
      .post(`/api/v1/lnd/employees/${employee1Id}/skills`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        skillName: 'Unauthorized Skill',
        level: 'EXPERT',
      });
    expect(skillRes.status).toBe(403);
  });
});
