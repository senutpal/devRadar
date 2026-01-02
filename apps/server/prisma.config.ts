/**
 * Prisma Configuration
 *
 * Prisma 7 configuration file for CLI commands (migrate, db push, etc.)
 * Database URL for migrations is configured here.
 *
 * IMPORTANT: In Prisma 7, env vars must be explicitly loaded with dotenv.
 */

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Path to the Prisma schema file
  schema: 'prisma/schema.prisma',

  // Migration settings
  migrations: {
    path: 'prisma/migrations',
  },

  // Database connection for Prisma CLI (migrate, db push, studio)
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
