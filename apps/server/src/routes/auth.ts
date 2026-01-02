/**
 * Authentication Routes
 *
 * Handles GitHub OAuth flow:
 * - GET /auth/github - Redirect to GitHub login
 * - GET /auth/callback - Handle OAuth callback
 */

import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { isProduction } from '@/config';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getGitHubAuthUrl, authenticateWithGitHub } from '@/services/github';

/**
 * Callback query params schema.
 */
const CallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * Register authentication routes.
 */
export function authRoutes(app: FastifyInstance): void {
  /**
   * GET /auth/github
   * Redirect to GitHub OAuth authorization page.
   */
  app.get('/auth/github', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in secure cookie for validation
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    const authUrl = getGitHubAuthUrl(state);

    logger.debug({ state }, 'Redirecting to GitHub OAuth');

    return reply.redirect(authUrl);
  });

  /**
   * GET /auth/callback
   * Handle GitHub OAuth callback.
   * Returns JWT token on success.
   */
  app.get(
    '/auth/callback',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = CallbackQuerySchema.safeParse(request.query);

      if (!result.success) {
        throw new ValidationError('Invalid callback parameters', {
          details: { errors: result.error.issues },
        });
      }

      const { code, state, error, error_description } = result.data;

      // Validate CSRF state
      const storedState = request.cookies.oauth_state;
      if (!state || !storedState || state !== storedState) {
        logger.warn({ providedState: state }, 'OAuth state mismatch');
        return reply.status(400).send({
          error: {
            code: 'INVALID_STATE',
            message: 'Invalid OAuth state parameter',
          },
        });
      }

      // Clear the state cookie
      reply.clearCookie('oauth_state');

      // Handle OAuth errors from GitHub
      if (error) {
        logger.warn({ error, error_description }, 'GitHub OAuth error');
        return reply.status(400).send({
          error: {
            code: 'OAUTH_ERROR',
            message: error_description ?? error,
          },
        });
      }

      // Authenticate with GitHub
      const user = await authenticateWithGitHub(code);

      // Generate JWT
      const token = app.jwt.sign(
        {
          userId: user.id,
          username: user.username,
          tier: user.tier,
        },
        { expiresIn: '7d' }
      );

      logger.info({ userId: user.id }, 'User authenticated successfully');

      // Return token and user info
      // In production, the extension would intercept this or use a custom URI scheme
      return reply.send({
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            tier: user.tier,
          },
        },
      });
    }
  );

  /**
   * POST /auth/refresh
   * Refresh JWT token (requires valid token).
   */
  app.post(
    '/auth/refresh',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string; username: string; tier: string };

      const token = app.jwt.sign(
        {
          userId: user.userId,
          username: user.username,
          tier: user.tier,
        },
        { expiresIn: '7d' }
      );

      return reply.send({
        data: { token },
      });
    }
  );

  /**
   * POST /auth/logout
   * Logout and blacklist the current token.
   */
  app.post(
    '/auth/logout',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Extract token from Authorization header
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);

          // Decode token to get expiry (without verification since we already verified)
          const decoded = app.jwt.decode(token) as { exp?: number } | null;
          if (decoded?.exp) {
            const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);

            // Import dynamically to avoid circular dependency
            const { blacklistToken } = await import('@/services/redis');
            await blacklistToken(token, ttlSeconds);

            logger.info('Token blacklisted on logout');
          }
        }
      } catch (error) {
        // Log but don't fail the logout
        logger.warn({ error }, 'Failed to blacklist token during logout');
      }

      return reply.send({
        data: { message: 'Logged out successfully' },
      });
    }
  );
}
