import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('App Endpoints & DB', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should test the database connection successfully', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    expect(result).toEqual([{ result: 1 }]);
  });

  it('should return exactly the specified health response format', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: "ok"
      }
    });
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toBe('Endpoint not found');
  });

});
