/**
 * Environment Configuration
 *
 * Validates environment variables using Zod (12-factor app style).
 */

import { z } from 'zod';

const envSchema = z.object({
  /* Node environment */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /* Server */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  /* Database */
  DATABASE_URL: z
    .string()
    .url()
    .refine((url: string) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),
  /* Redis */
  REDIS_URL: z
    .string()
    .url()
    .refine((url: string) => url.startsWith('redis://') || url.startsWith('rediss://'), {
      message: 'REDIS_URL must be a valid Redis connection string',
    }),
  /* JWT */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /* GitHub OAuth */
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z.string().url(),
  /* Logging */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/** Parsed and validated environment configuration. */
export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:\n', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

/** Validated environment configuration singleton. */
export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';

export const isDevelopment = env.NODE_ENV === 'development';

export const isTest = env.NODE_ENV === 'test';
