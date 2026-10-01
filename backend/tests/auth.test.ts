import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth & User Management & RBAC Tests', () => {
  let activeUserId: number;
  let disabledUserId: number;
  let noRoleUserId: number;
  let testRefreshToken: string;
  let headOfHrRoleId: number;

  const JWT_SECRET = process.env.JWT_SECRET!;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();

    // Setup Roles and Permissions
    const headOfHrRole = await prisma.role.create({ data: { name: 'HEAD_OF_HR' } });
    headOfHrRoleId = headOfHrRole.id;
    const adminRole = await prisma.role.create({ data: { name: 'HR_ADMIN' } });
    const permRead = await prisma.permission.create({ data: { action: 'USER_READ' } });
    
    await prisma.rolePermission.create({ data: { roleId: headOfHrRole.id, permissionId: permRead.id } });

    // Setup Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const activeUser = await prisma.user.create({
      data: {
        email: 'active@test.com',
        password: hashedPassword,
        isActive: true,
        roles: { create: { roleId: headOfHrRole.id } }
      }
    });
    activeUserId = activeUser.id;

    const disabledUser = await prisma.user.create({
      data: {
        email: 'disabled@test.com',
        password: hashedPassword,
        isActive: false,
      }
    });
    disabledUserId = disabledUser.id;

    const noRoleUser = await prisma.user.create({
      data: {
        email: 'norole@test.com',
        password: hashedPassword,
        isActive: true,
      }
    });
    noRoleUserId = noRoleUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Auth Tests ---
  it('should login successfully', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'active@test.com',
      password: 'password123'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    
    testRefreshToken = res.body.data.refreshToken;
  });

  it('should fail login with invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'active@test.com',
      password: 'wrongpassword'
    });
    expect(res.status).toBe(401);
  });

  it('should fail login for unknown user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'unknown@test.com',
      password: 'password123'
    });
    expect(res.status).toBe(401);
  });

  it('should fail login for disabled user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'disabled@test.com',
      password: 'password123'
    });
    expect(res.status).toBe(401);
  });

  it('should refresh token successfully', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: testRefreshToken
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should reject expired access token', async () => {
    const expiredToken = jwt.sign({ id: activeUserId }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('should access protected route with valid token', async () => {
    const token = jwt.sign({ id: activeUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('active@test.com');
  });

  it('should logout successfully', async () => {
    const token = jwt.sign({ id: activeUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: testRefreshToken });
    expect(res.status).toBe(200);

    // Refresh should now fail
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: testRefreshToken
    });
    expect(refreshRes.status).toBe(401);
  });

  // --- RBAC Tests ---
  it('should allow access with correct role (HEAD_OF_HR)', async () => {
    const token = jwt.sign({ id: activeUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).post(`/api/v1/users/${noRoleUserId}/activate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should deny access with incorrect role', async () => {
    const token = jwt.sign({ id: noRoleUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).post(`/api/v1/users/${activeUserId}/deactivate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should allow access with correct permission (USER_READ)', async () => {
    const token = jwt.sign({ id: activeUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should deny access without correct permission (USER_READ)', async () => {
    const token = jwt.sign({ id: noRoleUserId }, JWT_SECRET, { expiresIn: '15m' });
    const res = await request(app).get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

});
