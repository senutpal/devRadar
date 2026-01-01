/**
 * Authentication Routes
 *
 * Handles GitHub OAuth flow:
 * - GET /auth/github - Redirect to GitHub login
 * - GET /auth/callback - Handle OAuth callback
 */

import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

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

    // Store state in session/cookie for validation (simplified for now)
    // In production, use secure cookies or session storage

    const authUrl = getGitHubAuthUrl(state);

    logger.debug({ state }, 'Redirecting to GitHub OAuth');

    return reply.redirect(authUrl);
  });

  /**
   * GET /auth/callback
   * Handle GitHub OAuth callback.
   * Returns JWT token on success.
   */
  app.get('/auth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = CallbackQuerySchema.safeParse(request.query);

    if (!result.success) {
      throw new ValidationError('Invalid callback parameters', {
        details: { errors: result.error.issues },
      });
    }

    const { code, error, error_description } = result.data;

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
  });

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
   * Logout (client-side token removal).
   * Server-side we could invalidate refresh tokens if we had them.
   */
  app.post('/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    // With JWT, logout is primarily client-side
    // We could add token blacklisting for enhanced security
    return reply.send({
      data: { message: 'Logged out successfully' },
    });
  });
}
