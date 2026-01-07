import * as esbuild from 'esbuild';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/server.js',
  sourcemap: true,
  // Resolve @devradar/shared from source since workspace symlinks are tricky
  alias: {
    '@devradar/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
  },
  // Externalize packages that have CJS/ESM issues or native bindings
  external: [
    // Fastify and plugins (some use CJS require internally)
    'fastify',
    '@fastify/*',
    // Prisma (has native engines)
    '@prisma/client',
    '@prisma/adapter-pg',
    // Database drivers (native bindings)
    'pg',
    'pg-native',
    'ioredis',
    // Logging
    'pino',
    'pino-pretty',
  ],
});

console.log('Build complete!');
