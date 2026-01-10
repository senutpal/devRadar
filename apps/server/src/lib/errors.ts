/**
 * Application Error Hierarchy.
 *
 * Errors are categorized into:
 * - Operational errors (expected, recoverable)
 * - Programming errors (unexpected, non-recoverable)
 */

/**
 * Base application error.
 *
 * All domain-specific errors must extend this class to ensure
 * consistent error handling, logging, and API responses.
 */
export abstract class AppError extends Error {
  /** Stable error code for programmatic handling */
  abstract readonly code: string;

  /** Associated HTTP status code */
  abstract readonly statusCode: number;

  /** Indicates whether the error is expected and recoverable */
  abstract readonly isOperational: boolean;

  /** ISO-8601 timestamp when the error was created */
  readonly timestamp: string;

  /** Optional trace identifier for request correlation */
  traceId?: string;

  /** Optional structured error details */
  details?: Record<string, unknown>;

  constructor(message: string, options?: { cause?: Error; details?: Record<string, unknown> }) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();

    if (options?.details) {
      this.details = options.details;
    }

    /* Capture stack trace when supported (V8 environments) */
    if (
      typeof (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace === 'function'
    ) {
      (
        Error as unknown as {
          captureStackTrace: (target: Error, constructor: unknown) => void;
        }
      ).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for API responses.
   *
   * Stack traces and internal metadata are intentionally excluded.
   */
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

/* Operational Errors (Expected, Recoverable) */

/**
 * 400 Bad Request.
 *
 * Indicates invalid client input or failed validation.
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      details?: Record<string, unknown>;
      fields?: FieldError[];
    }
  ) {
    super(message, options);

    if (options?.fields) {
      this.details = { ...this.details, fields: options.fields };
    }
  }
}

/**
 * Field-level validation error metadata.
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * 401 Unauthorized.
 *
 * Indicates missing or invalid authentication credentials.
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
 * 403 Forbidden.
 *
 * Indicates insufficient permissions for the requested operation.
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
 * Alias for {@link AuthorizationError}.
 */
export const ForbiddenError = AuthorizationError;

/**
 * 404 Not Found.
 *
 * Indicates that a requested resource does not exist.
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
 * 409 Conflict.
 *
 * Indicates a resource state conflict or duplicate entity.
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
 * 429 Too Many Requests.
 *
 * Indicates that a rate limit has been exceeded.
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly isOperational = true;

  /** Number of seconds until the rate limit resets */
  retryAfter?: number;

  constructor(message = 'Too many requests. Please try again later.', retryAfter?: number) {
    super(message);

    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }

  /**
   * Serializes the error including rate-limit metadata.
   */
  override toJSON(): Record<string, unknown> {
    const json = super.toJSON();

    if (this.retryAfter !== undefined) {
      json.retryAfter = this.retryAfter;
    }

    return json;
  }
}

/* Programming Errors (Unexpected, Non-Recoverable) */

/**
 * 500 Internal Server Error.
 *
 * Indicates an unexpected application failure.
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
 * 503 Service Unavailable.
 *
 * Indicates temporary failure of an external dependency.
 */
export class ServiceUnavailableError extends AppError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor(service: string, options?: { cause?: Error }) {
    super(`${service} is temporarily unavailable. Please try again later.`, options);
  }
}

/* Type Guards & Utilities */

/**
 * Determines whether a value is an {@link AppError}.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Determines whether an error is operational and recoverable.
 */
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

/**
 * Normalizes unknown errors into an {@link AppError}.
 *
 * Ensures all thrown errors conform to the application error contract.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, { cause: error });
  }

  return new InternalError(String(error));
}
