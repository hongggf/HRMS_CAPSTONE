/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  setupFiles: ['./tests/setup.ts'],
  setupFilesAfterEnv: ['./tests/setupAfterEnv.ts'],
  globalSetup: './tests/globalSetup.ts'
};
