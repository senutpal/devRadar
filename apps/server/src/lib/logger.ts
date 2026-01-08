/**
 * Structured Logger
 *
 * Pino-based logger with JSON output, pretty printing in dev,
 * sensitive data redaction, and correlation ID support.
 */

import pino, { type Logger } from 'pino';

import { env, isDevelopment } from '@/config';

/**
 * Fields to redact from logs for security.
 * Never log passwords, tokens, or PII ***/
const REDACT_PATHS = [
  'password',
  'accessToken',
  'refreshToken',
  'authorization',
  'token',
  'secret',
  'apiKey',
  'email',
  '*.password',
  '*.token',
  '*.secret',
  '*.email',
  'user.email',
  'headers.authorization',
  'headers.cookie',
];

function createLogger(): Logger {
  const options: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'devradar-server',
      env: env.NODE_ENV,
    },
  };
  /* Pretty print in development for readability */
  if (isDevelopment) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(options);
}

/** Application logger singleton. */
export const logger = createLogger();

/*** Create a child logger with additional context.
 * Useful for request-scoped logging with correlation IDs.
 *
 * @param bindings - Additional context to include in all logs
 * @returns Child logger with bindings
 *
 * @example
 * const reqLogger = createChildLogger({ traceId: 'abc123', userId: 'user_1' });
 * reqLogger.info('Processing request');
 */
export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

/**
 * Log levels for reference ***/
export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;
