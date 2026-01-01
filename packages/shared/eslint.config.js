import baseConfig from '@devradar/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
