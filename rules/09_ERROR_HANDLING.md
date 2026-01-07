# 09. Error Handling & Logging

> **Principle**: Errors are inevitable. How we handle them defines user experience and debuggability.

---

## 12. Error Classification

### Error Hierarchy

```typescript
/* Base error class */
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean; // Expected vs Programming error
  readonly timestamp = new Date().toISOString();
  readonly traceId?: string;
}
/* Operational errors (expected, recoverable) */
class ValidationError extends AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  isOperational = true;
}

class AuthenticationError extends AppError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  isOperational = true;
}

class AuthorizationError extends AppError {
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  isOperational = true;
}

class NotFoundError extends AppError {
  code = 'NOT_FOUND';
  statusCode = 404;
  isOperational = true;
}

class RateLimitError extends AppError {
  code = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
  isOperational = true;
}
/* Programming errors (unexpected, crash the process) */
class InternalError extends AppError {
  code = 'INTERNAL_ERROR';
  statusCode = 500;
  isOperational = false;
}
```

---

### Error Severity Matrix

| Severity  | Description                      | Action                      | Example                      |
| --------- | -------------------------------- | --------------------------- | ---------------------------- |
| **FATAL** | System cannot continue           | Page on-call, crash process | DB connection pool exhausted |
| **ERROR** | Operation failed, impact to user | Alert, log, investigate     | Payment processing failed    |
| **WARN**  | Degraded but operational         | Log, monitor                | Cache miss, using fallback   |
| **INFO**  | Normal business event            | Log                         | User logged in               |
| **DEBUG** | Developer diagnostics            | Log (dev only)              | Request payload trace        |

---

## Error Propagation Rules

### Never Swallow Errors

```typescript
/* ❌ BAD - Error silently ignored */
try {
  await riskyOperation();
} catch (e) {
  /* Empty catch block */
}
/* ✅ GOOD - Error handled or re-thrown */
try {
  await riskyOperation();
} catch (e) {
  logger.error('Risky operation failed', { error: e, context: 'user-sync' });
  throw new InternalError('Failed to sync user', { cause: e });
}
```

### Type-Safe Error Catching

```typescript
/* TypeScript 4.x+ strict error handling */
try {
  await fetchUser(id);
} catch (error: unknown) {
  if (error instanceof NotFoundError) {
    return null; // Expected case
  }
  if (error instanceof Error) {
    logger.error('Unexpected error', { message: error.message });
  }
  throw error; // Re-throw unknown errors
}
```

---

## Retry Policies

### Exponential Backoff Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
};
/* Delay calculation: min(baseDelay * 2^attempt, maxDelay) + jitter */
```

### What to Retry

| Scenario         | Retry?                    | Max Attempts |
| ---------------- | ------------------------- | ------------ |
| Network timeout  | ✅ Yes                    | 3            |
| 5xx server error | ✅ Yes                    | 3            |
| 429 rate limit   | ✅ Yes (with Retry-After) | 3            |
| 4xx client error | ❌ No                     | 0            |
| Validation error | ❌ No                     | 0            |
| Auth error       | ❌ No                     | 0            |

---

## Circuit Breaker

### Implementation

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  successThreshold: number; // Successes to close
  timeout: number; // Time in open state before half-open
}

const REDIS_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};
```

### States

1. **CLOSED**: Normal operation, requests pass through.
2. **OPEN**: Too many failures, requests fail immediately.
3. **HALF-OPEN**: Testing if service recovered, limited requests allowed.

---

## Graceful Degradation

### DevRadar Degradation Strategies

| Component           | Failure         | Degradation                               |
| ------------------- | --------------- | ----------------------------------------- |
| Redis               | Connection lost | Return cached presence, mark "stale"      |
| PostgreSQL          | Query timeout   | Return "unknown" for stats                |
| GitHub OAuth        | API down        | Allow existing sessions, block new logins |
| Spotify Integration | Unavailable     | Hide "listening to" status                |

### Feature Flags for Degradation

```typescript
/* Emergency kill switches */
const isFeatureEnabled = (feature: string): boolean => {
  const flags = getFeatureFlags();
  return flags[feature]?.enabled ?? false;
};
/* Graceful degradation in code */
if (isFeatureEnabled('spotify_integration')) {
  try {
    status.listening = await getSpotifyStatus(userId);
  } catch (e) {
    logger.warn('Spotify integration failed', { error: e });
    /* Don't fail the entire request */
  }
}
```

---

## User-Safe Error Messages

### Message Transformation

| Internal Message                                 | User-Facing Message                                  |
| ------------------------------------------------ | ---------------------------------------------------- |
| `ECONNREFUSED 10.0.0.5:5432`                     | "Service temporarily unavailable. Please try again." |
| `duplicate key value violates unique constraint` | "This username is already taken."                    |
| `JWT expired at 2024-01-01T00:00:00Z`            | "Your session has expired. Please log in again."     |
| `Redis BRPOP timeout`                            | "Loading your friends list..."                       |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [{ "field": "email", "message": "Must be a valid email address." }],
    "traceId": "abc123-def456",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## 13. Logging Standards

### Structured Logging Format

```typescript
/* Use Pino for structured JSON logging */
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
/* Example output */
logger.info({ userId: 'u_123', action: 'login', method: 'github_oauth' }, 'User logged in');
/* {"level":"info","time":"2024-01-01T12:00:00.000Z","userId":"u_123","action":"login","method":"github_oauth","msg":"User logged in"} */
```

### Log Levels Usage

| Level   | When to Use         | Example                                  |
| ------- | ------------------- | ---------------------------------------- |
| `fatal` | Application crash   | "Unhandled exception, shutting down"     |
| `error` | Operation failed    | "Failed to save user to database"        |
| `warn`  | Unusual but handled | "Rate limit approaching for user X"      |
| `info`  | Business events     | "User joined team", "Heartbeat received" |
| `debug` | Diagnostics         | "WebSocket message payload: {...}"       |
| `trace` | Detailed tracing    | "Entering function processHeartbeat"     |

### Sensitive Data Redaction

```typescript
/* Pino redaction config */
const logger = pino({
  redact: {
    paths: ['password', 'accessToken', 'refreshToken', 'authorization', '*.password'],
    censor: '[REDACTED]',
  },
});
/* NEVER log these fields: */
/* - Passwords */
/* - Tokens (JWT, API keys) */
/* - PII (email in debug logs) */
/* - File contents */
/* - Query parameters with secrets */
```

### Correlation IDs

```typescript
/* Middleware to propagate trace IDs */
const correlationMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  /* Attach to all logs in this request */
  req.log = logger.child({ traceId });
  next();
};
```

### Log Retention

| Environment | Retention                    | Storage                 |
| ----------- | ---------------------------- | ----------------------- |
| Development | 7 days                       | Local / CloudWatch      |
| Staging     | 30 days                      | CloudWatch              |
| Production  | 90 days (hot), 1 year (cold) | CloudWatch → S3 Glacier |

---

## WebSocket Error Handling (DevRadar Specific)

### Client Disconnect Handling

```typescript
ws.on('close', (code, reason) => {
  const closeReasons: Record<number, string> = {
    1000: 'Normal closure',
    1001: 'Going away',
    1006: 'Abnormal closure (no close frame)',
    1011: 'Server error',
  };

  logger.info(
    {
      event: 'ws_disconnect',
      userId: ws.userId,
      code,
      reason: closeReasons[code] || 'Unknown',
    },
    'Client disconnected'
  );
  /* Set user offline after grace period */
  setTimeout(() => markUserOffline(ws.userId), 60000);
});
```

### Message Validation Errors

```typescript
ws.on('message', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    const validated = HeartbeatSchema.safeParse(message);

    if (!validated.success) {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          details: validated.error.issues,
        })
      );
      return;
    }

    await processHeartbeat(validated.data);
  } catch (e) {
    logger.warn({ error: e }, 'Invalid WebSocket message');
    /* Don't crash - just ignore malformed messages */
  }
});
```
