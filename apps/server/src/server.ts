/**
 * DevRadar server entry point.
 *
 * Bootstraps and configures the Fastify HTTP and WebSocket server, registers
 * all middleware and routes, and manages application lifecycle concerns such
 * as startup validation, health checks, logging, and graceful shutdown.
 *
 * Architecture overview:
 * - Fastify for HTTP with plugin-based extensibility
 * - WebSockets for real-time presence and collaboration
 * - PostgreSQL via Prisma for persistent storage
 * - Redis for caching, pub/sub, and ephemeral state
 * - Pino for structured, high-performance logging
 */

import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyRawBody from 'fastify-raw-body';

import { env, isProduction, isDevelopment } from '@/config';
import { toAppError, AuthenticationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { authRoutes } from '@/routes/auth';
import { billingRoutes } from '@/routes/billing';
import { friendRequestRoutes } from '@/routes/friendRequests';
import { friendRoutes } from '@/routes/friends';
import { leaderboardRoutes } from '@/routes/leaderboards';
import { slackRoutes } from '@/routes/slack';
import { statsRoutes } from '@/routes/stats';
import { teamRoutes } from '@/routes/teams';
import { userRoutes } from '@/routes/users';
import { webhookRoutes } from '@/routes/webhooks';
import { connectDb, disconnectDb, isDbHealthy } from '@/services/db';
import { connectRedis, disconnectRedis, isRedisHealthy } from '@/services/redis';
import { registerWebSocketHandler, getConnectionCount } from '@/ws/handler';

/**
 * Builds and configures the Fastify application instance.
 *
 * This function registers all core plugins, middleware, routes, authentication
 * mechanisms, error handling, and observability hooks. It does not start the
 * HTTP server or connect external services.
 *
 * @returns A fully configured Fastify application instance
 */
async function buildServer() {
  const app = Fastify({
    logger: false,
    trustProxy: isProduction,
    disableRequestLogging: true,
  });

  await app.register(fastifyCors, {
    origin: isDevelopment ? true : [env.WEB_APP_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyCookie);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  await app.register(fastifyRateLimit, {
    max: isProduction ? 100 : 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
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

  await app.register(fastifyRawBody, {
    global: false,
  });

  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1024 * 64,
      clientTracking: true,
    },
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();

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

  app.addHook('onRequest', (request, _reply, done) => {
    const existingTraceId = request.headers['x-trace-id'] as string | undefined;
    const traceId = existingTraceId ?? crypto.randomUUID();
    request.headers['x-trace-id'] = traceId;
    (request as FastifyRequest & { log: typeof logger }).log = logger.child({ traceId });
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    if (request.url === '/health') {
      done();
      return;
    }

    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: `${reply.elapsedTime.toFixed(2)}ms`,
        traceId: request.headers['x-trace-id'],
      },
      'Request completed'
    );
    done();
  });

  app.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    const traceId = request.headers['x-trace-id'] as string;

    appError.traceId = traceId;

    if (appError.isOperational) {
      logger.warn({ code: appError.code, message: appError.message, traceId }, 'Operational error');
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

    return reply.status(appError.statusCode).send({
      error: appError.toJSON(),
    });
  });

  app.get('/health', async (_request, reply) => {
    const [dbHealthy, redisHealthy] = await Promise.all([isDbHealthy(), isRedisHealthy()]);

    const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

    return reply.status(status === 'healthy' ? 200 : 503).send({
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
    });
  });

  app.register(
    (api, _opts, done) => {
      api.register(userRoutes, { prefix: '/users' });
      api.register(friendRoutes, { prefix: '/friends' });
      api.register(friendRequestRoutes, { prefix: '/friend-requests' });
      api.register(statsRoutes, { prefix: '/stats' });
      api.register(leaderboardRoutes, { prefix: '/leaderboards' });
      api.register(teamRoutes, { prefix: '/teams' });
      done();
    },
    { prefix: '/api/v1' }
  );

  app.register(authRoutes, { prefix: '/auth' });
  app.register(billingRoutes, { prefix: '/billing' });
  app.register(webhookRoutes, { prefix: '/webhooks' });
  app.register(slackRoutes, { prefix: '/slack' });

  registerWebSocketHandler(app);

  return app;
}

/**
 * Starts the HTTP server and manages the application lifecycle.
 *
 * This function initializes the Fastify server, establishes connections to
 * external services, begins listening for incoming requests, and registers
 * graceful shutdown handlers for process termination signals.
 *
 * @throws If server startup or service initialization fails
 */
async function start(): Promise<void> {
  let app: Awaited<ReturnType<typeof buildServer>> | null = null;

  try {
    app = await buildServer();

    logger.info('Connecting to services...');
    await Promise.all([connectDb(), connectRedis()]);

    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    logger.info(
      {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
      },
      'DevRadar server started'
    );

    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutdown signal received');

      const timeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out');
        /* eslint-disable-next-line no-process-exit */
        process.exit(1);
      }, 30_000);

      try {
        await Promise.all([app?.close(), disconnectDb(), disconnectRedis()]);

        clearTimeout(timeout);
        logger.info('Graceful shutdown complete');
        /* eslint-disable-next-line no-process-exit */
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        clearTimeout(timeout);
        /* eslint-disable-next-line no-process-exit */
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

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

/** Application entry point. */
void start();
