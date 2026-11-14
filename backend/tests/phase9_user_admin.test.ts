import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const generateToken = (userId: number, expiresIn: string = '1h') =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: expiresIn as any });

describe('Phase 9: User Administration, Notifications & Audit Logs', () => {
  let headAdminUser: any;
  let headAdminToken: string;
  let testRole: any;
  let createdUserId: number;

  beforeAll(async () => {
    // Ensure roles exist
    const headRole = await prisma.role.upsert({
      where: { name: 'HEAD_OF_HR' },
      update: {},
      create: { name: 'HEAD_OF_HR' },
    });

    testRole = await prisma.role.upsert({
      where: { name: 'HR_ADMIN' },
      update: {},
      create: { name: 'HR_ADMIN' },
    });

    // Ensure permissions
    const permissionsList = ['USER_CREATE', 'USER_READ', 'USER_ROLE_ASSIGN'];
    for (const action of permissionsList) {
      const perm = await prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: headRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: headRole.id, permissionId: perm.id },
      });
    }

    // Create Head of HR test user
    headAdminUser = await prisma.user.create({
      data: {
        email: 'phase9.head@example.com',
        password: 'HashedPassword123!',
        isActive: true,
        roles: { create: { roleId: headRole.id } },
      },
    });
    headAdminToken = generateToken(headAdminUser.id);
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
      await prisma.auditLog.deleteMany({ where: { actorId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    if (headAdminUser) {
      await prisma.userRole.deleteMany({ where: { userId: headAdminUser.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: headAdminUser.id } });
      await prisma.user.deleteMany({ where: { id: headAdminUser.id } });
    }
    await prisma.$disconnect();
  });

  describe('User Administration API', () => {
    it('USER-001: should create a new user with verified role assignment', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${headAdminToken}`)
        .send({
          email: 'phase9.newuser@example.com',
          password: 'Password123!',
          roleId: testRole.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('phase9.newuser@example.com');
      createdUserId = res.body.data.user.id;
    });

    it('USER-002: should list paginated users directory', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.users.find((u: any) => u.id === createdUserId);
      expect(found).toBeDefined();
      expect(found.email).toBe('phase9.newuser@example.com');
      expect(found.isActive).toBe(true);
    });

    it('USER-003: should reassign role using verified role ID', async () => {
      const headRole = await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' } });
      const res = await request(app)
        .post(`/api/v1/users/${createdUserId}/role`)
        .set('Authorization', `Bearer ${headAdminToken}`)
        .send({ roleId: headRole!.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const userRoles = await prisma.userRole.findMany({
        where: { userId: createdUserId },
        include: { role: true },
      });
      expect(userRoles.some((ur) => ur.role.name === 'HEAD_OF_HR')).toBe(true);
    });

    it('USER-004: should deactivate user successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${createdUserId}/deactivate`)
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(user?.isActive).toBe(false);
    });

    it('USER-005: deactivated user session should be immediately rejected (session invalidation)', async () => {
      const deactivatedUserToken = generateToken(createdUserId);
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${deactivatedUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Unauthorized');
    });

    it('USER-006: should activate user successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${createdUserId}/activate`)
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(user?.isActive).toBe(true);
    });

    it('USER-007: should prevent self-deactivation', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${headAdminUser.id}/deactivate`)
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot deactivate your own account');
    });

    it('USER-008: should prevent last-administrator lockout', async () => {
      // Revert created user to HR_ADMIN so headAdminUser is the only active HEAD_OF_HR
      await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
      await prisma.userRole.create({ data: { userId: createdUserId, roleId: testRole.id } });

      // Create a temporary secondary HEAD_OF_HR
      const secondAdmin = await prisma.user.create({
        data: {
          email: 'phase9.secondadmin@example.com',
          password: 'Password123!',
          isActive: true,
          roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: 'HEAD_OF_HR' } }))!.id } },
        },
      });
      const secondAdminToken = generateToken(secondAdmin.id);

      try {
        // Deactivating headAdminUser by secondAdmin succeeds because secondAdmin is active
        const deactFirst = await request(app)
          .post(`/api/v1/users/${headAdminUser.id}/deactivate`)
          .set('Authorization', `Bearer ${secondAdminToken}`);
        expect(deactFirst.status).toBe(200);

        // Now secondAdmin is the ONLY active HEAD_OF_HR in the system!
        // Attempting to demote secondAdmin must fail with last admin lockout
        const demoteAttempt = await request(app)
          .post(`/api/v1/users/${secondAdmin.id}/role`)
          .set('Authorization', `Bearer ${secondAdminToken}`)
          .send({ roleId: testRole.id });
        expect(demoteAttempt.status).toBe(400);
        expect(demoteAttempt.body.error.message).toContain('Cannot demote the last active administrator');
      } finally {
        // Ensure headAdminUser is reactivated
        await prisma.user.update({ where: { id: headAdminUser.id }, data: { isActive: true } });
        // Clean up secondAdmin
        await prisma.userRole.deleteMany({ where: { userId: secondAdmin.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: secondAdmin.id } });
        await prisma.user.deleteMany({ where: { id: secondAdmin.id } });
      }
    });
  });

  describe('Audit Logs API', () => {
    it('AUDIT-001: should return paginated audit logs with search and module filter', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?module=USER&page=1&limit=20')
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
    });

    it('AUDIT-002: should filter audit logs by action and date range', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(`/api/v1/audit-logs?action=USER_CREATED&startDate=${pastDate}&endDate=${futureDate}`)
        .set('Authorization', `Bearer ${headAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
