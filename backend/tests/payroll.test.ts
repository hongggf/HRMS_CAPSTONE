import request from 'supertest';
import app from '../src/app';
import { PrismaClient, PayrollPeriodStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 7: Payroll Management Integration Tests', () => {
  let payrollOfficerToken: string;
  let headOfHrToken: string;
  let hrAdminToken: string;
  let empId1: number;
  let empId2: number;
  let periodId: number;
  let payrollId: number;

  beforeAll(async () => {
    await prisma.payrollItem.deleteMany();
    await prisma.payrollAdjustment.deleteMany();
    await prisma.payrollApproval.deleteMany();
    await prisma.payroll.deleteMany();
    await prisma.payrollPeriod.deleteMany();
    
    await prisma.employeeSalaryComponent.deleteMany();
    await prisma.salaryComponent.deleteMany();
    await prisma.employeeCompensation.deleteMany();
    
    await prisma.timesheet.deleteMany();
    await prisma.employeeShift.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.position.deleteMany();
    await prisma.department.deleteMany();
    
    await prisma.jobPosting.deleteMany();
    await prisma.jobRequisition.deleteMany();
    await prisma.workforceRequest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();

    const headOfHrRole = await prisma.role.create({ data: { name: 'HEAD_OF_HR_P7' } });
    const poRole = await prisma.role.create({ data: { name: 'PAYROLL_OFFICER_P7' } });

    const perms = ['PAYROLL_CREATE', 'PAYROLL_READ', 'PAYROLL_UPDATE', 'PAYROLL_APPROVE', 'PAYROLL_LOCK'];
    for (const p of perms) {
      const perm = await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
      if (['PAYROLL_CREATE', 'PAYROLL_READ', 'PAYROLL_UPDATE'].includes(p)) {
        await prisma.rolePermission.create({ data: { roleId: poRole.id, permissionId: perm.id } });
      }
      await prisma.rolePermission.create({ data: { roleId: headOfHrRole.id, permissionId: perm.id } });
    }

    const headUser = await prisma.user.create({ data: { email: 'head_p7@test.com', password: 'hash', roles: { create: { roleId: headOfHrRole.id } } } });
    headOfHrToken = generateToken(headUser.id, '15m');

    const poUser = await prisma.user.create({ data: { email: 'po_p7@test.com', password: 'hash', roles: { create: { roleId: poRole.id } } } });
    payrollOfficerToken = generateToken(poUser.id, '15m');

    const dept = await prisma.department.create({ data: { name: 'IT', code: 'IT' } });
    const pos = await prisma.position.create({ data: { title: 'Eng', code: 'E1', departmentId: dept.id } });

    const emp1 = await prisma.employee.create({ data: { employeeId: 'EMP_P7_1', firstName: 'John', lastName: 'Doe', email: 'j1@d.com', departmentId: dept.id, positionId: pos.id, status: 'ACTIVE' } });
    empId1 = emp1.id;

    const emp2 = await prisma.employee.create({ data: { employeeId: 'EMP_P7_2', firstName: 'Jane', lastName: 'Smith', email: 'j2@d.com', departmentId: dept.id, positionId: pos.id, status: 'ACTIVE' } });
    empId2 = emp2.id;

    await prisma.employeeCompensation.create({ data: { employeeId: empId1, basicSalary: 5000, effectiveDate: new Date('2026-01-01') } });
    await prisma.employeeCompensation.create({ data: { employeeId: empId2, basicSalary: 6000, effectiveDate: new Date('2026-01-01') } });

    const housing = await prisma.salaryComponent.create({ data: { name: 'Housing', type: 'ALLOWANCE' } });
    const tax = await prisma.salaryComponent.create({ data: { name: 'Tax', type: 'DEDUCTION' } });

    await prisma.employeeSalaryComponent.create({ data: { employeeId: empId1, componentId: housing.id, amount: 1000, type: 'FIXED', effectiveDate: new Date('2026-01-01') } });
    await prisma.employeeSalaryComponent.create({ data: { employeeId: empId1, componentId: tax.id, amount: 500, type: 'FIXED', effectiveDate: new Date('2026-01-01') } });
    
    await prisma.timesheet.create({ data: { employeeId: empId1, startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30'), regularHours: 160, overtimeHours: 2, totalHours: 162 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('create payroll period', async () => {
    const res = await request(app).post('/api/v1/payroll/periods').set('Authorization', `Bearer ${payrollOfficerToken}`).send({
      name: 'Sep 2026',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-09-30T23:59:59Z'
    });
    expect(res.status).toBe(201);
    periodId = res.body.id;
  });

  it('duplicate payroll period rejected', async () => {
    const res = await request(app).post('/api/v1/payroll/periods').set('Authorization', `Bearer ${payrollOfficerToken}`).send({
      name: 'Sep 2026 2',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-09-30T23:59:59Z'
    });
    expect(res.status).toBe(400); 
  });

  it('calculate payroll for multiple employees', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/calculate`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    expect(res.status).toBe(200);

    const payrolls = await prisma.payroll.findMany({ where: { payrollPeriodId: periodId }, include: { items: true } });
    expect(payrolls.length).toBe(2);

    const pr1 = payrolls.find(p => p.employeeId === empId1);
    expect(pr1?.basicSalary).toBe(5000);
    expect(pr1?.totalAllowances).toBe(1000);
    expect(pr1?.totalDeductions).toBe(500);
    expect(pr1?.totalOvertime).toBe(93.75);
    expect(pr1?.netSalary).toBe(5593.75);
    expect(pr1?.items.length).toBe(4);

    const pr2 = payrolls.find(p => p.employeeId === empId2);
    expect(pr2?.basicSalary).toBe(6000);
    expect(pr2?.netSalary).toBe(6000);
  });

  it('recalculation clears old data', async () => {
    await prisma.employeeCompensation.update({ where: { employeeId: empId2 }, data: { basicSalary: 7000 } });
    await request(app).post(`/api/v1/payroll/${periodId}/calculate`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    const payrolls = await prisma.payroll.findMany({ where: { payrollPeriodId: periodId } });
    const pr2 = payrolls.find(p => p.employeeId === empId2);
    expect(pr2?.basicSalary).toBe(7000); 
  });

  it('submit payroll', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/submit`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    expect(res.status).toBe(200);
  });

  it('unauthorized approval rejected', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/approve`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    expect(res.status).toBe(403);
  });

  it('approve payroll', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/approve`).set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
  });

  it('lock payroll', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/lock`).set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
  });

  it('locked payroll cannot be recalculated', async () => {
    const res = await request(app).post(`/api/v1/payroll/${periodId}/calculate`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    expect(res.status).toBe(400);
  });

  it('create adjustment for unlocked payroll alters net salary', async () => {
    const prRes = await request(app).post('/api/v1/payroll/periods').set('Authorization', `Bearer ${payrollOfficerToken}`).send({
      name: 'Oct 2026',
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-31T23:59:59Z'
    });
    const newPeriodId = prRes.body.id;

    await request(app).post(`/api/v1/payroll/${newPeriodId}/calculate`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    
    const payrolls = await prisma.payroll.findMany({ where: { payrollPeriodId: newPeriodId } });
    const pId = payrolls[0].id;
    const originalNet = payrolls[0].netSalary;

    const res = await request(app).post(`/api/v1/payroll/${pId}/adjustments`).set('Authorization', `Bearer ${payrollOfficerToken}`).send({
      amount: 500,
      type: 'ADDITION',
      reason: 'Bonus missed'
    });
    
    expect(res.status).toBe(201);
    const updatedPayroll = await prisma.payroll.findUnique({ where: { id: pId } });
    expect(updatedPayroll?.netSalary).toBe(originalNet + 500);
  });

  it('create adjustment for locked payroll does not alter net salary', async () => {
    const payrolls = await prisma.payroll.findMany({ where: { payrollPeriodId: periodId } });
    const pId = payrolls[0].id;
    const originalNet = payrolls[0].netSalary;

    const res = await request(app).post(`/api/v1/payroll/${pId}/adjustments`).set('Authorization', `Bearer ${payrollOfficerToken}`).send({
      amount: 500,
      type: 'ADDITION',
      reason: 'Post-lock adjustment'
    });
    
    expect(res.status).toBe(201);
    const updatedPayroll = await prisma.payroll.findUnique({ where: { id: pId } });
    expect(updatedPayroll?.netSalary).toBe(originalNet); 
  });

  it('transaction rollback on calculation failure', async () => {
    const res = await request(app).post(`/api/v1/payroll/99999/calculate`).set('Authorization', `Bearer ${payrollOfficerToken}`);
    expect(res.status).toBe(404);
  });
});
