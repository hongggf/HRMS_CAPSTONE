import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const generateToken = (userId: number, expiresIn: string) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: expiresIn as any });

describe('Phase 11: Notification & Audit Tests', () => {
  let userToken: string;
  let userId: number;
  let notificationId: number;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: 'notif.user@example.com', password: 'hashed' }
    });
    userId = user.id;
    userToken = generateToken(userId, '1h');
    
    // Create some notifications
    const notif = await prisma.notification.create({
      data: {
        recipientId: userId,
        title: 'Welcome',
        message: 'Welcome to HRMS',
        type: 'INFO'
      }
    });
    notificationId = notif.id;

    await prisma.notification.create({
      data: {
        recipientId: userId,
        title: 'Alert',
        message: 'Action required',
        type: 'ALERT'
      }
    });
  });

  afterAll(async () => {
    await prisma.notificationPreference.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { recipientId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it('NOTIF-001 Retrieve notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('NOTIF-002 Get unread count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  it('NOTIF-003 Mark read', async () => {
    const res = await request(app)
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('NOTIF-004 Mark all read', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    
    // Verify unread count is 0
    const unreadRes = await request(app)
      .get('/api/v1/notifications/unread')
      .set('Authorization', `Bearer ${userToken}`);
    expect(unreadRes.body.count).toBe(0);
  });

  it('NOTIF-005 Update preferences', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: false, inApp: true });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(false);
    expect(res.body.inApp).toBe(true);
  });
});
