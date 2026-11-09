import request from 'supertest';
import app from '../src/app';
import { PrismaClient, RequestStatus, AttendanceStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 6: Attendance & Leave Management Integration Tests', () => {
  let hrToken: string;
  let noRoleToken: string;
  let hrId: number;
  let empId: number;
  let shiftId: number;
  let leaveTypeId: number;
  let leaveBalanceId: number;
  let attendanceId: number;
  let leaveRequestId: number;
  let overtimeId: number;

  beforeAll(async () => {
    // Clear relevant tables
    const perms = ['ATTENDANCE_CREATE', 'ATTENDANCE_READ', 'ATTENDANCE_UPDATE', 'LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'OVERTIME_CREATE', 'OVERTIME_READ', 'OVERTIME_UPDATE', 'TIMESHEET_READ', 'SHIFT_CREATE', 'SHIFT_READ'];
    for (const p of perms) {
      await prisma.permission.upsert({ where: { action: p }, update: {}, create: { action: p } });
    }

    const hrRole = await prisma.role.create({
      data: {
        name: 'HR_ATTENDANCE_TEST',
        permissions: {
          create: perms.map(p => ({ permission: { connect: { action: p } } }))
        }
      }
    });

    const hrUser = await prisma.user.create({
      data: { email: 'hr_att@test.local', password: 'hash', roles: { create: { roleId: hrRole.id } } }
    });
    hrId = hrUser.id;
    hrToken = generateToken(hrId, '15m');

    const noRoleUser = await prisma.user.create({ data: { email: 'norole_att@test.local', password: 'hash' } });
    noRoleToken = generateToken(noRoleUser.id, '15m');

    const dept = await prisma.department.create({ data: { name: 'IT', code: 'IT' } });
    const pos = await prisma.position.create({ data: { title: 'Eng', code: 'E1', departmentId: dept.id } });

    const emp = await prisma.employee.create({
      data: { employeeId: 'EMP_ATT', firstName: 'John', lastName: 'Doe', email: 'j@d.com', departmentId: dept.id, positionId: pos.id, status: 'ACTIVE' }
    });
    empId = emp.id;

    const shift = await prisma.shift.create({
      data: { name: 'Morning', startTime: '09:00', endTime: '17:00', breakDuration: 60, workingDays: '1,2,3,4,5' }
    });
    shiftId = shift.id;

    const leaveType = await prisma.leaveType.create({
      data: { name: 'Annual Leave', daysAllowed: 20, isPaid: true, requiresBalance: true }
    });
    leaveTypeId = leaveType.id;

    const lb = await prisma.leaveBalance.create({
      data: { employeeId: empId, leaveTypeId: leaveTypeId, year: 2026, balance: 20, used: 0 }
    });
    leaveBalanceId = lb.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('unauthorized access rejected', async () => {
    const res = await request(app).post('/api/v1/shifts').set('Authorization', `Bearer ${noRoleToken}`).send({});
    expect(res.status).toBe(403);
  });

  it('assign shift', async () => {
    const res = await request(app).post('/api/v1/shifts/assign').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      shiftId: shiftId,
      startDate: new Date().toISOString()
    });
    expect(res.status).toBe(201);
  });

  it('check-in creates attendance', async () => {
    const res = await request(app).post('/api/v1/attendance/check-in').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      date: '2026-10-06T00:00:00Z',
      time: '2026-10-06T09:00:00Z'
    });
    expect(res.status).toBe(201);
    attendanceId = res.body.id;
  });

  it('duplicate check-in rejected', async () => {
    const res = await request(app).post('/api/v1/attendance/check-in').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      date: '2026-10-06T00:00:00Z',
      time: '2026-10-06T09:30:00Z'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Duplicate check-in');
  });

  it('check-out calculates working duration', async () => {
    const res = await request(app).post(`/api/v1/attendance/${attendanceId}/check-out`).set('Authorization', `Bearer ${hrToken}`).send({
      time: '2026-10-06T17:00:00Z' // 8 hours = 480 mins
    });
    expect(res.status).toBe(200);
    expect(res.body.workingMinutes).toBe(480);
  });

  it('leave request creation', async () => {
    const res = await request(app).post('/api/v1/leave').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      leaveTypeId: leaveTypeId,
      startDate: '2026-12-01T00:00:00Z',
      endDate: '2026-12-05T00:00:00Z', // 5 days
      reason: 'Vacation'
    });
    expect(res.status).toBe(201);
    leaveRequestId = res.body.id;
  });

  it('leave approval validates and deducts balance', async () => {
    const res = await request(app).put(`/api/v1/leave/${leaveRequestId}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(200);
    
    // check balance
    const lb = await prisma.leaveBalance.findUnique({ where: { id: leaveBalanceId } });
    expect(lb?.used).toBe(5);
  });

  it('leave approval rejected if insufficient balance', async () => {
    const req2 = await prisma.leaveRequest.create({
      data: { employeeId: empId, leaveTypeId: leaveTypeId, startDate: new Date('2026-12-10'), endDate: new Date('2026-12-30'), reason: 'Long', status: 'SUBMITTED' }
    });
    const res = await request(app).put(`/api/v1/leave/${req2.id}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Leave balance insufficient');
  });

  it('overtime approval', async () => {
    const ov = await request(app).post('/api/v1/overtime').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      date: '2026-10-06T00:00:00Z',
      hours: 2,
      reason: 'Extra work'
    });
    expect(ov.status).toBe(201);
    overtimeId = ov.body.id;

    const res = await request(app).put(`/api/v1/overtime/${overtimeId}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(200);
  });

  it('timesheet calculation', async () => {
    const res = await request(app).post('/api/v1/timesheets/generate').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-31T00:00:00Z'
    });
    
    expect(res.status).toBe(200);
    // 480 mins regular = 8 hours. Overtime = 2 hours. Total = 10 hours.
    expect(res.body.regularHours).toBe(8);
    expect(res.body.overtimeHours).toBe(2);
    expect(res.body.totalHours).toBe(10);
  });

  it('duplicate check-out rejected', async () => {
    const res = await request(app).post(`/api/v1/attendance/${attendanceId}/check-out`).set('Authorization', `Bearer ${hrToken}`).send({
      time: '2026-10-06T18:00:00Z'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Already checked out');
  });

  it('check-out rejected if check-out time is earlier than check-in time', async () => {
    // Create new attendance
    const attRes = await request(app).post('/api/v1/attendance/check-in').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      date: '2026-10-07T00:00:00Z',
      time: '2026-10-07T09:00:00Z'
    });
    expect(attRes.status).toBe(201);

    const res = await request(app).post(`/api/v1/attendance/${attRes.body.id}/check-out`).set('Authorization', `Bearer ${hrToken}`).send({
      time: '2026-10-07T08:00:00Z'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot be earlier than check-in time');
  });

  it('leave request rejected if end date is earlier than start date', async () => {
    const res = await request(app).post('/api/v1/leave').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      leaveTypeId: leaveTypeId,
      startDate: '2026-12-10T00:00:00Z',
      endDate: '2026-12-05T00:00:00Z',
      reason: 'Invalid dates'
    });
    expect(res.status).toBe(400);
  });

  it('leave request rejected if overlapping with existing leave', async () => {
    // We already have leaveRequestId approved for 2026-12-01 to 2026-12-05
    const res = await request(app).post('/api/v1/leave').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      leaveTypeId: leaveTypeId,
      startDate: '2026-12-03T00:00:00Z',
      endDate: '2026-12-07T00:00:00Z',
      reason: 'Overlapping request'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Overlapping leave request already exists');
  });

  it('self-approval rejected for leave request', async () => {
    // Create an employee linked to hrUser
    const selfDept = await prisma.department.findFirst();
    const selfPos = await prisma.position.findFirst();
    const selfEmp = await prisma.employee.create({
      data: {
        employeeId: 'SELF_EMP',
        firstName: 'HR',
        lastName: 'Self',
        email: 'self_att@test.local',
        userId: hrId,
        departmentId: selfDept!.id,
        positionId: selfPos!.id,
        status: 'ACTIVE'
      }
    });

    const selfLeave = await prisma.leaveRequest.create({
      data: {
        employeeId: selfEmp.id,
        leaveTypeId: leaveTypeId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-03'),
        reason: 'Self leave',
        status: 'SUBMITTED'
      }
    });

    // HR user attempts to approve their own leave request
    const res = await request(app).put(`/api/v1/leave/${selfLeave.id}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Cannot approve your own leave request');
  });

  it('self-approval rejected for overtime request', async () => {
    const selfEmp = await prisma.employee.findUnique({ where: { employeeId: 'SELF_EMP' } });
    const selfOt = await prisma.overtimeRequest.create({
      data: {
        employeeId: selfEmp!.id,
        date: new Date('2026-11-01'),
        hours: 3,
        reason: 'Weekend release',
        status: 'SUBMITTED'
      }
    });

    const res = await request(app).put(`/api/v1/overtime/${selfOt.id}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Cannot approve your own overtime request');
  });

  it('approval conflict rejected if request already approved or rejected', async () => {
    // leaveRequestId is already approved
    const res = await request(app).put(`/api/v1/leave/${leaveRequestId}/status`).set('Authorization', `Bearer ${hrToken}`).send({
      status: 'APPROVED'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already been approved');
  });

  it('timesheet generation rejected if end date is earlier than start date', async () => {
    const res = await request(app).post('/api/v1/timesheets/generate').set('Authorization', `Bearer ${hrToken}`).send({
      employeeId: empId,
      startDate: '2026-10-31T00:00:00Z',
      endDate: '2026-10-01T00:00:00Z'
    });
    expect(res.status).toBe(400);
  });

  it('lists shifts, leave types, balances, and attendances', async () => {
    const shiftsRes = await request(app).get('/api/v1/shifts').set('Authorization', `Bearer ${hrToken}`);
    expect(shiftsRes.status).toBe(200);
    expect(Array.isArray(shiftsRes.body)).toBe(true);

    const typesRes = await request(app).get('/api/v1/leave/types').set('Authorization', `Bearer ${hrToken}`);
    expect(typesRes.status).toBe(200);
    expect(Array.isArray(typesRes.body)).toBe(true);

    const attRes = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${hrToken}`);
    expect(attRes.status).toBe(200);
    expect(Array.isArray(attRes.body)).toBe(true);

    const timesheetRes = await request(app).get('/api/v1/timesheets').set('Authorization', `Bearer ${hrToken}`);
    expect(timesheetRes.status).toBe(200);
    expect(Array.isArray(timesheetRes.body)).toBe(true);
  });
});
