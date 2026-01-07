/*** Custom Error Classes
 *
 * Hierarchical error system following rules/09_ERROR_HANDLING.md.
 * Distinguishes between operational errors (expected) and programming errors (bugs) ***/

/*** Base application error class.
 * All custom errors extend from this ***/
export abstract class AppError extends Error {
  /** Error code for programmatic handling */
  abstract readonly code: string;

  /** HTTP status code */
  abstract readonly statusCode: number;

  /** Whether this is an operational error (expected) vs programming error */
  abstract readonly isOperational: boolean;

  /** ISO timestamp when error occurred */
  readonly timestamp: string;

  /** Optional trace ID for correlation */
  traceId?: string;

  /** Additional error details */
  details?: Record<string, unknown> | undefined;

  constructor(message: string, options?: { cause?: Error; details?: Record<string, unknown> }) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    if (options?.details) {
      this.details = options.details;
    }
    /* V8-specific: guard against environments without captureStackTrace */
    if (
      typeof (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace === 'function'
    ) {
      (
        Error as unknown as { captureStackTrace: (target: Error, constructor: unknown) => void }
      ).captureStackTrace(this, this.constructor);
    } else {
      const fallbackStack = new Error().stack;
      if (fallbackStack) {
        this.stack = fallbackStack;
      }
    }
  }

  /*** Convert to JSON-safe object for API responses.
   * Excludes sensitive information like stack traces ***/
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
    };
  }
}
/* =================== */
/* Operational Errors (Expected, Recoverable) */
/* =================== */

/*** 400 Bad Request - Invalid input data
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    options?: { cause?: Error; details?: Record<string, unknown>; fields?: FieldError[] }
  ) {
    super(message, options);
    if (options?.fields) {
      this.details = { ...this.details, fields: options.fields };
    }
  }
}

/**
 * Field-level validation error detail
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message = 'You do not have permission to access this resource') {
    super(message);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource = 'Resource', id?: string) {
    super(id ? `${resource} with ID '${id}' not found` : `${resource} not found`);
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(
    message = 'Conflict',
    options?: { cause?: Error; details?: Record<string, unknown> }
  ) {
    super(message, options);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly isOperational = true;

  /** Seconds until rate limit resets */
  retryAfter?: number | undefined;

  constructor(message = 'Too many requests. Please try again later.', retryAfter?: number) {
    super(message);
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }

  /**
   * Override toJSON to include retryAfter in API responses ***/
  override toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    if (this.retryAfter !== undefined) {
      json.retryAfter = this.retryAfter;
    }
    return json;
  }
}
/* =================== */
/* Programming Errors (Unexpected, Non-Recoverable) */
/* =================== */

/*** 500 Internal Server Error - Unexpected programming error
 */
export class InternalError extends AppError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message = 'An unexpected error occurred', options?: { cause?: Error }) {
    super(message, options);
  }
}

/**
 * 503 Service Unavailable - External service failure
 */
export class ServiceUnavailableError extends AppError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor(service: string, options?: { cause?: Error }) {
    super(`${service} is temporarily unavailable. Please try again later.`, options);
  }
}
/* =================== */
/* Type Guards */
/* =================== */

/**
 * Check if an error is an AppError instance ***/
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/*** Check if an error is operational (expected/recoverable) ***/
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

/*** Wrap unknown errors into AppError.
 * Use this to ensure consistent error handling ***/
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, { cause: error });
  }

  return new InternalError(String(error));
}
