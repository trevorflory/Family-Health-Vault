/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@family-health-vault/shared$':
      '<rootDir>/packages/shared/src/index.ts',
    '^@family-health-vault/shared/(.*)$':
      '<rootDir>/packages/shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          jsx: 'react',
          types: ['jest', 'node'],
          rootDir: '.',
          ignoreDeprecations: '6.0',
        },
      },
    ],
  },
};
