import baseConfig from '@devradar/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: ['prisma.config.ts', 'prisma/generated/**'],
  },
];
