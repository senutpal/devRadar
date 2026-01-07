/*** DevRadar Server
 *
 * Main entry point for the Fastify HTTP/WebSocket server.
 *
 * Architecture:
 * - Fastify 5 for HTTP with plugin-based extensibility
 * - @fastify/websocket for real-time presence
 * - Prisma 7 for PostgreSQL database
 * - ioredis for Redis pub/sub
 * - Pino for structured logging
 */

import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';

import { env, isProduction, isDevelopment } from '@/config';
import { toAppError, AuthenticationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { authRoutes } from '@/routes/auth';
import { friendRoutes } from '@/routes/friends';
import { userRoutes } from '@/routes/users';
import { connectDb, disconnectDb, isDbHealthy } from '@/services/db';
import { connectRedis, disconnectRedis, isRedisHealthy } from '@/services/redis';
import { registerWebSocketHandler, getConnectionCount } from '@/ws/handler';

/**
 * Create and configure the Fastify server ***/
async function buildServer() {
  const app = Fastify({
    logger: false, // We use our own Pino logger
    trustProxy: isProduction,
    disableRequestLogging: true, // We'll log requests ourselves
  });
  /* =================== */
  /* Core Plugins */
  /* =================== */
  /* CORS - Configure based on environment */
  await app.register(fastifyCors, {
    origin: isDevelopment
      ? true // Allow all in development
      : ['https://devradar.io', /\.devradar\.io$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  /* Cookie support (for OAuth CSRF state) */
  await app.register(fastifyCookie);
  /* Security headers */
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false, // Required for some OAuth flows
  });
  /* JWT authentication */
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });
  /* Rate limiting */
  await app.register(fastifyRateLimit, {
    max: isProduction ? 100 : 1000, // More lenient in development
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      /* Use user ID if authenticated, otherwise IP */
      const user = request.user as { userId?: string } | undefined;
      return user?.userId ?? request.ip;
    },
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    }),
  });
  /* WebSocket support */
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1024 * 64, // 64KB max message size
      clientTracking: true,
    },
  });
  /* =================== */
  /* Authentication Decorator */
  /* =================== */

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      /* Check if token is blacklisted (for logout support) */
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const { isTokenBlacklisted } = await import('@/services/redis');
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new AuthenticationError('Token has been revoked');
        }
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid or expired token');
    }
  });
  /* =================== */
  /* Request Logging Hook */
  /* =================== */

  app.addHook('onRequest', (request, _reply, done) => {
    /* Generate trace ID for request correlation */
    const existingTraceId = request.headers['x-trace-id'] as string | undefined;
    const traceId = existingTraceId ?? crypto.randomUUID();
    request.headers['x-trace-id'] = traceId;
    /* Attach child logger with trace ID */
    (request as FastifyRequest & { log: typeof logger }).log = logger.child({ traceId });
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const { method, url } = request;
    const { statusCode } = reply;
    const responseTime = reply.elapsedTime;
    /* Don't log health checks to reduce noise */
    if (url === '/health') {
      done();
      return;
    }

    logger.info(
      {
        method,
        url,
        statusCode,
        responseTime: `${responseTime.toFixed(2)}ms`,
        traceId: request.headers['x-trace-id'],
      },
      'Request completed'
    );
    done();
  });
  /* =================== */
  /* Global Error Handler */
  /* =================== */

  app.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    const traceId = request.headers['x-trace-id'] as string;

    appError.traceId = traceId;
    /* Log based on error type */
    if (appError.isOperational) {
      logger.warn(
        {
          code: appError.code,
          message: appError.message,
          traceId,
        },
        'Operational error'
      );
    } else {
      logger.error(
        {
          code: appError.code,
          message: appError.message,
          stack: appError.stack,
          traceId,
        },
        'Unexpected error'
      );
    }
    /* Send error response */
    return reply.status(appError.statusCode).send({
      error: appError.toJSON(),
    });
  });
  /* =================== */
  /* Health Check */
  /* =================== */

  app.get('/health', async (_request, reply) => {
    const [dbHealthy, redisHealthy] = await Promise.all([isDbHealthy(), isRedisHealthy()]);

    const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

    const health = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.0',
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
      connections: {
        websocket: getConnectionCount(),
      },
    };

    const statusCode = status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send(health);
  });
  /* =================== */
  /* API Routes */
  /* =================== */
  /* Prefix all API routes with /api/v1 */
  app.register(
    (api, _opts, done) => {
      api.register(userRoutes, { prefix: '/users' });
      api.register(friendRoutes, { prefix: '/friends' });
      done();
    },
    { prefix: '/api/v1' }
  );
  /* Auth routes at root for OAuth redirects (GITHUB_CALLBACK_URL should use /auth/callback) */
  app.register(authRoutes, { prefix: '/auth' });
  /* =================== */
  /* WebSocket Handler */
  /* =================== */

  registerWebSocketHandler(app);

  return app;
}

/*** Start the server with graceful shutdown ***/
async function start(): Promise<void> {
  let app: Awaited<ReturnType<typeof buildServer>> | null = null;

  try {
    /* Build server */
    app = await buildServer();
    /* Connect to services */
    logger.info('Connecting to services...');
    await Promise.all([connectDb(), connectRedis()]);
    /* Start listening */
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    const serverUrl = `http://${env.HOST}:${String(env.PORT)}`;
    logger.info(
      {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
      },
      `🚀 DevRadar server started at ${serverUrl}`
    );
    /* =================== */
    /* Graceful Shutdown */
    /* =================== */

    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutdown signal received');
      /* Set a timeout for graceful shutdown */
      const shutdownTimeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        /* eslint-disable-next-line no-process-exit */
        process.exit(1);
      }, 30_000);

      try {
        await Promise.all([
          app?.close().then(() => {
            logger.info('HTTP server closed');
          }),
          disconnectDb(),
          disconnectRedis(),
        ]);

        clearTimeout(shutdownTimeout);
        logger.info('Graceful shutdown complete');
        /* eslint-disable-next-line no-process-exit */
        process.exit(0);
      } catch (error: unknown) {
        logger.error({ error }, 'Error during shutdown');
        clearTimeout(shutdownTimeout);
        /* eslint-disable-next-line no-process-exit */
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    /* Handle uncaught errors - exit immediately, don't attempt graceful shutdown */
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception');
      /* eslint-disable-next-line no-process-exit */
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled rejection');
      /* eslint-disable-next-line no-process-exit */
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    throw error;
  }
}
/* Start the server */
void start();
