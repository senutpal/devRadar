import { baseConfig } from './base.js';
import pluginNext from '@next/eslint-plugin-next';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export const nextjsConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
];

export default nextjsConfig;
