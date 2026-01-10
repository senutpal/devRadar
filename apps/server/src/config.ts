/**
 * Environment configuration module.
 *
 * Parses, validates, and normalizes environment variables at application startup
 * using a schema-driven approach. If validation fails, the process terminates
 * immediately to prevent the application from running in an invalid state.
 *
 * This module follows 12-factor app principles by relying exclusively on
 * environment variables for configuration.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z
    .string()
    .url()
    .refine((url: string) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),

  REDIS_URL: z
    .string()
    .url()
    .refine((url: string) => url.startsWith('redis://') || url.startsWith('rediss://'), {
      message: 'REDIS_URL must be a valid Redis connection string',
    }),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z.string().url(),

  /* GitHub Webhooks (Optional) */
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .trim()
    .min(32, 'GITHUB_WEBHOOK_SECRET must be at least 32 characters')
    .optional(),

  /* Slack Integration (Optional) */
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/**
 * Strongly-typed representation of all validated environment variables.
 *
 * This type is derived directly from the environment schema and guarantees that
 * all required configuration values are present and correctly formatted.
 */
export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:\n', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

/**
 * Validated environment configuration singleton.
 *
 * This value is initialized at module load time. If validation fails,
 * the application will terminate immediately.
 */
export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';

export const isDevelopment = env.NODE_ENV === 'development';

export const isTest = env.NODE_ENV === 'test';
