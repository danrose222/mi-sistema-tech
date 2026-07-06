module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js',
    '!src/cron/**',
  ],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  maxWorkers: 1,
  testTimeout: 30000,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
