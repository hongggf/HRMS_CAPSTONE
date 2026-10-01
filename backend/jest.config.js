/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  setupFiles: ['./tests/setup.ts'],
};

// Override DATABASE_URL at the Node.js process level BEFORE any module loads.
// This is the only reliable way to ensure Prisma connects to the test database.
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/hrms_test?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.NODE_ENV = 'test';
