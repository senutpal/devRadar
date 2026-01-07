import baseConfig from '@devradar/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    /* Root-specific ignores (packages have their own ESLint configs) */
    ignores: ['packages/**', 'apps/**'],
  },
];
