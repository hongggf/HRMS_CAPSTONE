import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';

describe('Employee Portal & Payslip Ownership Security Tests', () => {
  let employeeAToken: string;
  let employeeBToken: string;
  let employeeAId: number;
  let employeeBId: number;
  let payrollAId: number;
  let payrollBId: number;
  let periodId: number;

  beforeAll(async () => {
    // 1. Roles
    const employeeRole = await prisma.role.upsert({
      where: { name: 'EMPLOYEE' },
      update: {},
      create: { name: 'EMPLOYEE' },
    });

    const hrPayrollRole = await prisma.role.upsert({
      where: { name: 'HR_PAYROLL' },
      update: {},
      create: { name: 'HR_PAYROLL' },
    });

    // 2. Department & Position
    const dept = await prisma.department.create({
      data: { name: `Fin_${Date.now()}`, code: `FIN_${Date.now().toString().slice(-4)}` },
    });

    const pos = await prisma.position.create({
      data: { title: `Analyst_${Date.now()}`, code: `AN_${Date.now().toString().slice(-4)}`, departmentId: dept.id },
    });

    // 3. Create Employee A and Employee B
    const hash = await bcrypt.hash('SecurePass123!', 10);

    const userA = await prisma.user.create({
      data: {
        email: `emp_a_${Date.now()}@company.local`,
        password: hash,
        isActive: true,
        roles: { create: { roleId: employeeRole.id } },
      },
    });

    const empA = await prisma.employee.create({
      data: {
        employeeId: `EMP-A-${Date.now().toString().slice(-4)}`,
        firstName: 'Alice',
        lastName: 'Alpha',
        email: userA.email,
        departmentId: dept.id,
        positionId: pos.id,
        userId: userA.id,
        status: 'ACTIVE',
      },
    });
    employeeAId = empA.id;

    const userB = await prisma.user.create({
      data: {
        email: `emp_b_${Date.now()}@company.local`,
        password: hash,
        isActive: true,
        roles: { create: { roleId: employeeRole.id } },
      },
    });

    const empB = await prisma.employee.create({
      data: {
        employeeId: `EMP-B-${Date.now().toString().slice(-4)}`,
        firstName: 'Bob',
        lastName: 'Beta',
        email: userB.email,
        departmentId: dept.id,
        positionId: pos.id,
        userId: userB.id,
        status: 'ACTIVE',
      },
    });
    employeeBId = empB.id;

    // Login A and B
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: userA.email,
      password: 'SecurePass123!',
    });
    employeeAToken = loginA.body.data.accessToken;

    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: userB.email,
      password: 'SecurePass123!',
    });
    employeeBToken = loginB.body.data.accessToken;

    // 4. Create a payroll period in APPROVED status
    const start = new Date(2026, 9, 1);
    const end = new Date(2026, 9, 31);

    const period = await prisma.payrollPeriod.create({
      data: {
        name: `October 2026_${Date.now()}`,
        startDate: start,
        endDate: end,
        status: 'APPROVED',
      },
    });
    periodId = period.id;

    // Create payslips for A and B
    const payA = await prisma.payroll.create({
      data: {
        payrollPeriodId: period.id,
        employeeId: empA.id,
        basicSalary: 5000,
        totalAllowances: 800,
        totalDeductions: 300,
        totalOvertime: 200,
        netSalary: 5700,
        status: 'APPROVED',
        items: {
          create: [
            { componentName: 'Basic Salary Component', componentType: 'OTHER', amount: 5000 },
            { componentName: 'Transport Allowance', componentType: 'ALLOWANCE', amount: 800 },
            { componentName: 'Income Tax', componentType: 'DEDUCTION', amount: 300 },
          ],
        },
      },
    });
    payrollAId = payA.id;

    const payB = await prisma.payroll.create({
      data: {
        payrollPeriodId: period.id,
        employeeId: empB.id,
        basicSalary: 8500,
        totalAllowances: 1200,
        totalDeductions: 700,
        totalOvertime: 0,
        netSalary: 9000,
        status: 'APPROVED',
        items: {
          create: [
            { componentName: 'Basic Salary Component', componentType: 'OTHER', amount: 8500 },
            { componentName: 'Executive Allowance', componentType: 'ALLOWANCE', amount: 1200 },
            { componentName: 'Income Tax', componentType: 'DEDUCTION', amount: 700 },
          ],
        },
      },
    });
    payrollBId = payB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Employee A can retrieve their own payslips via /payroll/payslips/my', async () => {
    const res = await request(app)
      .get('/api/v1/payroll/payslips/my')
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].employeeId).toBe(employeeAId);
    expect(res.body[0].netSalary).toBe(5700);
  });

  it('Employee A can retrieve their own payslips via /employees/me/payslips alias', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me/payslips')
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].employeeId).toBe(employeeAId);
  });

  it('SECURITY IDOR: Employee A CANNOT access Employee B payslips via /payroll/employees/:id/payslips', async () => {
    const res = await request(app)
      .get(`/api/v1/payroll/employees/${employeeBId}/payslips`)
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient permissions/i);
  });

  it('SECURITY IDOR: Employee A CANNOT access Employee B individual payslip via /payroll/payslips/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/payroll/payslips/${payrollBId}`)
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient permissions/i);
  });

  it('Employee A can access their own individual payslip with complete component breakdown', async () => {
    const res = await request(app)
      .get(`/api/v1/payroll/payslips/${payrollAId}`)
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(payrollAId);
    expect(res.body.employeeId).toBe(employeeAId);
    expect(res.body.netSalary).toBe(5700);
    expect(res.body.basicSalary).toBe(5000);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBe(3);
  });

  it('Employee A accesses the unified dashboard summary with real metrics', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me/dashboard')
      .set('Authorization', `Bearer ${employeeAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee.firstName).toBe('Alice');
    expect(res.body.data.latestPayslip).toBeDefined();
    expect(res.body.data.latestPayslip.netSalary).toBe(5700);
    expect(res.body.data.latestPayslip.periodStatus).toBe('APPROVED');
    expect(res.body.data.attendance).toBeDefined();
  });
});
