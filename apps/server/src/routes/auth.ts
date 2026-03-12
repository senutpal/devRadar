/**
 * Authentication Routes
 *
 * GitHub OAuth flow and Auth0 SSO/SAML for user authentication.
 */

import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { env, isProduction } from '@/config';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  isAuth0Configured,
  getAuth0AuthorizeUrl,
  exchangeAuth0Code,
  getAuth0UserInfo,
} from '@/services/auth0';
import { getDb } from '@/services/db';
import { getGitHubAuthUrl, authenticateWithGitHub } from '@/services/github';

/**
 * Callback query params schema ***/
const CallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const GitHubAuthQuerySchema = z.object({
  redirect_uri: z
    .string()
    .refine(
      (uri) =>
        uri.startsWith('vscode://') ||
        uri.startsWith('vscode-insiders://') ||
        uri.startsWith('https://') ||
        /* Allow http:// only in development for local testing */
        (!isProduction && uri.startsWith('http://')),
      'Invalid redirect URI scheme'
    )
    .optional(),
});

/** Registers authentication routes on the Fastify instance. */
export function authRoutes(app: FastifyInstance): void {
  // GET /github - Redirect to GitHub OAuth
  app.get('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    /* Parse query params */
    const queryResult = GitHubAuthQuerySchema.safeParse(request.query);
    const redirectUri = queryResult.success ? queryResult.data.redirect_uri : undefined;
    /* Generate state for CSRF protection */
    const state = crypto.randomUUID();
    /* Store state in secure cookie for validation */
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    /* Store redirect_uri in cookie for callback */
    if (redirectUri) {
      reply.setCookie('oauth_redirect_uri', redirectUri, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
      });
    }

    const authUrl = getGitHubAuthUrl(state);

    logger.debug({ state, redirectUri }, 'Redirecting to GitHub OAuth');

    return reply.redirect(authUrl);
  });

  // GET /callback - Handle OAuth callback
  app.get(
    '/callback',
    {
      config: {
        /* Rate limiting: 10 requests per minute per IP (CodeQL: rateLimit via @fastify/rate-limit) */
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
      /* Validate CSRF state */
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
      /* Clear the state cookie */
      reply.clearCookie('oauth_state');
      /* Handle OAuth errors from GitHub */
      if (error) {
        logger.warn({ error, error_description }, 'GitHub OAuth error');
        return reply.status(400).send({
          error: {
            code: 'OAUTH_ERROR',
            message: error_description ?? error,
          },
        });
      }
      /* Authenticate with GitHub */
      const user = await authenticateWithGitHub(code);
      /* Generate JWT */
      const token = app.jwt.sign(
        {
          userId: user.id,
          username: user.username,
          tier: user.tier,
        },
        { expiresIn: '7d' }
      );

      logger.info({ userId: user.id }, 'User authenticated successfully');
      /* Check for VS Code redirect URI */
      const redirectUri = request.cookies.oauth_redirect_uri;
      reply.clearCookie('oauth_redirect_uri');

      if (
        redirectUri &&
        (redirectUri.startsWith('vscode://') || redirectUri.startsWith('vscode-insiders://'))
      ) {
        /* Redirect to VS Code extension with token */
        const vsCodeUrl = new URL(redirectUri);
        vsCodeUrl.searchParams.set('token', token);

        logger.debug({ redirectUri: vsCodeUrl.toString() }, 'Redirecting to VS Code');
        return reply.redirect(vsCodeUrl.toString());
      }
      /* Fallback: Return token and user info as JSON */
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

  // POST /refresh - Refresh JWT token
  app.post(
    '/refresh',
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

  // POST /logout - Blacklist current token
  app.post(
    '/logout',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        /* Extract token from Authorization header */
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          /* Decode token to get expiry (without verification since we already verified) */
          const decoded = app.jwt.decode(token);
          if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
            const ttlSeconds = (decoded.exp as number) - Math.floor(Date.now() / 1000);
            /* Import dynamically to avoid circular dependency */
            const { blacklistToken } = await import('@/services/redis');
            await blacklistToken(token, ttlSeconds);

            logger.info('Token blacklisted on logout');
          }
        }
      } catch (error) {
        /* Log but don't fail the logout */
        logger.warn({ error }, 'Failed to blacklist token during logout');
      }

      return reply.send({
        data: { message: 'Logged out successfully' },
      });
    }
  );

  // ─── Auth0 SSO Routes ───────────────────────────────────────────────

  // GET /sso - Redirect to Auth0 for SSO login
  app.get('/sso', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuth0Configured()) {
      return reply.status(501).send({
        error: { code: 'SSO_NOT_CONFIGURED', message: 'SSO is not configured on this server' },
      });
    }

    const querySchema = z.object({
      connection: z.string().optional(),
    });
    const query = querySchema.safeParse(request.query);
    const connection = query.success ? query.data.connection : undefined;

    const state = crypto.randomUUID();

    reply.setCookie('sso_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const authUrl = getAuth0AuthorizeUrl(state, connection);
    logger.debug({ connection }, 'Redirecting to Auth0 SSO');

    return reply.redirect(authUrl);
  });

  // GET /sso/callback - Auth0 SSO callback
  app.get(
    '/sso/callback',
    {
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isAuth0Configured()) {
        return reply.status(501).send({
          error: { code: 'SSO_NOT_CONFIGURED', message: 'SSO is not configured' },
        });
      }

      const callbackSchema = z.object({
        code: z.string().min(1),
        state: z.string().min(1),
        error: z.string().optional(),
        error_description: z.string().optional(),
      });

      const result = callbackSchema.safeParse(request.query);
      if (!result.success) {
        throw new ValidationError('Invalid SSO callback parameters');
      }

      const { code, state, error, error_description } = result.data;

      /* Validate CSRF state */
      const storedState = request.cookies.sso_state;
      if (!state || !storedState || state !== storedState) {
        logger.warn('SSO state mismatch');
        return reply.status(400).send({
          error: { code: 'INVALID_STATE', message: 'Invalid SSO state parameter' },
        });
      }
      reply.clearCookie('sso_state');

      if (error) {
        logger.warn({ error, error_description }, 'Auth0 SSO error');
        return reply.status(400).send({
          error: { code: 'SSO_ERROR', message: error_description ?? error },
        });
      }

      /* Exchange code for tokens and fetch user info */
      const tokens = await exchangeAuth0Code(code);
      const userInfo = await getAuth0UserInfo(tokens.access_token);

      const db = getDb();

      /* Find existing user by email or create a new one */
      let user = await db.user.findFirst({
        where: { email: userInfo.email },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            githubId: `auth0_${userInfo.sub}`,
            username: userInfo.nickname ?? userInfo.email.split('@')[0] ?? 'user',
            displayName: userInfo.name || null,
            avatarUrl: userInfo.picture || null,
            email: userInfo.email,
            tier: 'TEAM',
          },
        });

        logger.info({ userId: user.id, email: userInfo.email }, 'New SSO user created');
      }

      /* Generate JWT */
      const token = app.jwt.sign(
        {
          userId: user.id,
          username: user.username,
          tier: user.tier,
        },
        { expiresIn: '7d' }
      );

      logger.info({ userId: user.id }, 'SSO authentication successful');

      /* Redirect to web app with token */
      const webUrl = new URL('/dashboard', env.WEB_APP_URL);
      webUrl.searchParams.set('token', token);
      return reply.redirect(webUrl.toString());
    }
  );

  // GET /sso/status - Check if SSO is available
  app.get('/sso/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      enabled: isAuth0Configured(),
    });
  });
}
