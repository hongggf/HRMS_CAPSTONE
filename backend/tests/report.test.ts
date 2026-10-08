import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 12: Reports Tests', () => {
  let headOfHrToken: string;
  let hrUserId: number;

  beforeAll(async () => {
    const headOfHrRole = await prisma.role.upsert({ where: { name: 'HEAD_OF_HR' }, update: {}, create: { name: 'HEAD_OF_HR' } });
    const user = await prisma.user.create({
      data: { 
        email: 'reports.user@example.com', 
        password: 'hashed',
        roles: { create: { roleId: headOfHrRole.id } }
      }
    });
    hrUserId = user.id;
    headOfHrToken = generateToken(user.id, '1h');
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: hrUserId } });
  });

  it('REP-001 Get dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalEmployees');
  });

  it('REP-002 Get employee reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/employees')
      .set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('REP-003 Get recruitment reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/recruitment')
      .set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('REP-004 Get attendance reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/attendance')
      .set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('REP-005 Get payroll reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/payroll')
      .set('Authorization', `Bearer ${headOfHrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
