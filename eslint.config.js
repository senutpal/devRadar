import baseConfig from '@devradar/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [
      // Ignore all packages - they have their own configs
      'packages/**',
      'apps/**',
      // Ignore build artifacts and dependencies
      '**/dist/**',
      '**/node_modules/**',
      '.turbo/**',
    ],
  },
];
