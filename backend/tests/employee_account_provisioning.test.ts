import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';

describe('Employee Account Provisioning & ESS Security Tests', () => {
  let hrAdminToken: string;
  let hrAdminUserId: number;
  let employeeId1: number;
  let employeeId2: number;
  let activationToken: string;
  let employee1AccessToken: string;
  let departmentId: number;
  let positionId: number;

  beforeAll(async () => {
    // 1. Get or create roles and permissions
    const perms = [
      'EMPLOYEE_CREATE',
      'EMPLOYEE_READ',
      'EMPLOYEE_UPDATE',
      'EMPLOYEE_ACTIVATE',
      'DOCUMENT_UPLOAD',
    ];
    for (const action of perms) {
      await prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      });
    }

    const hrAdminRole = await prisma.role.upsert({
      where: { name: 'HR_ADMIN' },
      update: {},
      create: { name: 'HR_ADMIN' },
    });

    const employeeRole = await prisma.role.upsert({
      where: { name: 'EMPLOYEE' },
      update: {},
      create: { name: 'EMPLOYEE' },
    });

    // Link permissions to HR_ADMIN
    for (const action of perms) {
      const p = await prisma.permission.findUnique({ where: { action } });
      if (p) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: hrAdminRole.id, permissionId: p.id } },
          update: {},
          create: { roleId: hrAdminRole.id, permissionId: p.id },
        });
      }
    }

    // 2. Create an HR Admin user
    const hashedHrPass = await bcrypt.hash('Password123!', 10);
    const hrUser = await prisma.user.create({
      data: {
        email: `hr_admin_${Date.now()}@test.com`,
        password: hashedHrPass,
        isActive: true,
        roles: { create: { roleId: hrAdminRole!.id } },
      },
    });
    hrAdminUserId = hrUser.id;

    // Login as HR Admin to get access token
    const hrLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: hrUser.email,
      password: 'Password123!',
    });
    expect(hrLoginRes.status).toBe(200);
    hrAdminToken = hrLoginRes.body.data.accessToken;

    // 3. Setup department and position
    const deptSuffix = Date.now().toString().slice(-4);
    const dept = await prisma.department.create({
      data: { name: `Engineering_${deptSuffix}`, code: `ENG_${deptSuffix}` },
    });
    departmentId = dept.id;

    const pos = await prisma.position.create({
      data: { title: `Software Engineer_${deptSuffix}`, code: `SWE_${deptSuffix}`, departmentId },
    });
    positionId = pos.id;

    // 4. Create two employee records (Employee 1 and Employee 2)
    const emp1 = await prisma.employee.create({
      data: {
        employeeId: `EMP-${Date.now().toString().slice(-4)}1`,
        firstName: 'Alice',
        lastName: 'Developer',
        email: `alice_${Date.now()}@company.local`,
        departmentId,
        positionId,
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE',
      },
    });
    employeeId1 = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        employeeId: `EMP-${Date.now().toString().slice(-4)}2`,
        firstName: 'Bob',
        lastName: 'Manager',
        email: `bob_${Date.now()}@company.local`,
        departmentId,
        positionId,
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE',
      },
    });
    employeeId2 = emp2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: HR initiates account creation for employee
  it('HR Admin can initiate account provisioning for an employee profile', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId1}/provision-account`)
      .set('Authorization', `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe(employeeId1);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.invitationLink).toContain('/employee/activate?token=');

    activationToken = res.body.data.token;

    // Verify User record in DB
    const linkedUser = await prisma.user.findUnique({
      where: { id: res.body.data.userId },
      include: { roles: { include: { role: true } } },
    });

    expect(linkedUser).toBeDefined();
    expect(linkedUser!.isActive).toBe(false); // Inactive until activation
    expect(linkedUser!.roles.some((r) => r.role.name === 'EMPLOYEE')).toBe(true);
    // Must NOT have any HR administrative permissions
    expect(linkedUser!.roles.some((r) => r.role.name.startsWith('HR_'))).toBe(false);

    // Verify Employee links to User
    const emp = await prisma.employee.findUnique({ where: { id: employeeId1 } });
    expect(emp!.userId).toBe(linkedUser!.id);
  });

  // Test 2: Token verification
  it('Public endpoint can verify the single-use invitation token', async () => {
    const res = await request(app)
      .get(`/api/v1/auth/invitation/verify?token=${activationToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Alice');
    expect(res.body.data.lastName).toBe('Developer');
    expect(res.body.data.email).toContain('alice_');
  });

  // Test 3: Rejection of invalid token
  it('Rejects verification for nonexistent or corrupted token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/invitation/verify?token=invalid_token_xyz_123');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // Test 4: Password activation
  it('Employee sets password and activates their account via invitation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invitation/accept')
      .send({
        token: activationToken,
        password: 'EmployeeSecurePass1!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.roles).toContain('EMPLOYEE');

    // Verify DB user is now active
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId1 },
      include: { user: true },
    });
    expect(emp!.user!.isActive).toBe(true);
  });

  // Test 5: Single-use enforcement
  it('Enforces single-use token: token cannot be used a second time', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invitation/accept')
      .send({
        token: activationToken,
        password: 'AnotherPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message || res.body.error).toMatch(/already been used/i);
  });

  // Test 6: Employee logs in with newly created credentials
  it('Employee logs in using the standard authentication login endpoint', async () => {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId1 } });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: emp!.email,
        password: 'EmployeeSecurePass1!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.roles).toEqual(['EMPLOYEE']);

    employee1AccessToken = res.body.data.accessToken;
  });

  // Test 7: Employee accesses their own profile via GET /api/v1/employees/me
  it('Employee securely accesses their own profile via /employees/me using authenticated identity', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me')
      .set('Authorization', `Bearer ${employee1AccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(employeeId1);
    expect(res.body.data.firstName).toBe('Alice');
    expect(res.body.data.department).toBeDefined();
  });

  // Test 8: IDOR Prevention - Employee CANNOT access another employee's record
  it('SECURITY: Employee CANNOT access another employee record by tampering with the URL ID', async () => {
    const res = await request(app)
      .get(`/api/v1/employees/${employeeId2}`)
      .set('Authorization', `Bearer ${employee1AccessToken}`);

    // EMPLOYEE role does not have EMPLOYEE_READ permission and fails IDOR check
    expect(res.status).toBe(403);
  });

  // Test 9: Route Protection - Employee CANNOT access HR administrative endpoints
  it('SECURITY: Employee CANNOT access HR administrative user management endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${employee1AccessToken}`);

    expect(res.status).toBe(403);
  });

  it('SECURITY: Employee CANNOT create employee records', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${employee1AccessToken}`)
      .send({
        firstName: 'Hacker',
        lastName: 'Attempt',
      });

    expect(res.status).toBe(403);
  });

  it('SECURITY: Employee CANNOT access HR payroll endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${employee1AccessToken}`);

    expect(res.status).toBe(403);
  });
});
