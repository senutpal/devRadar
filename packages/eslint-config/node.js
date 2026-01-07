import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nodeConfig = [
  ...baseConfig,
  {
    rules: {
      /* Node.js specific rules */
      'no-process-exit': 'error',
    },
  },
];

export default nodeConfig;
