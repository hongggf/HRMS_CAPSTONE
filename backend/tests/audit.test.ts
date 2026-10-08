import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 11: Audit Log Tests', () => {
  let adminToken: string;
  let adminId: number;

  beforeAll(async () => {
    const adminRole = await prisma.role.upsert({ where: { name: 'HR_ADMIN' }, update: {}, create: { name: 'HR_ADMIN' } });
    const perm = await prisma.permission.upsert({ where: { action: 'USER_READ' }, update: {}, create: { action: 'USER_READ' } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {}, create: { roleId: adminRole.id, permissionId: perm.id }
    });

    const user = await prisma.user.create({
      data: { 
        email: 'audit.admin@example.com', 
        password: 'hashed',
        roles: { create: { roleId: adminRole.id } }
      }
    });
    adminId = user.id;
    adminToken = generateToken(user.id, '1h');
    
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'TEST_ACTION',
        module: 'TEST_MODULE',
        entityType: 'User',
        entityId: '1',
      }
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
    await prisma.user.delete({ where: { id: adminId } });
  });

  it('AUDIT-001 Retrieve audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });
});
