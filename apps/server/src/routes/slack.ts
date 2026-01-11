/**
 * Slack Routes
 *
 * Handles Slack OAuth flow and slash commands for team status.
 */

import crypto from 'crypto';

import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { env } from '@/config';
import {
  verifySlackRequest,
  getSlackInstallUrl,
  handleSlackOAuthCallback,
  getTeamStatus,
  formatStatusForSlack,
} from '@/integrations/slack';
import { ValidationError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';

const InstallQuerySchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

const CallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State is required'),
});

/* Slack slash command payload (form-urlencoded) */
interface SlashCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

/** Registers Slack routes on the Fastify instance. */
export function slackRoutes(app: FastifyInstance): void {
  const db = getDb();

  // Parse form-urlencoded body as string to preserve raw signature for /commands
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    }
  );

  // GET /install - Redirect to Slack OAuth
  app.get('/install', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string };

    const queryResult = InstallQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      throw new ValidationError('Team ID is required');
    }

    const { teamId } = queryResult.data;

    // Verify user is team owner or admin
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team', teamId);
    }

    const isOwner = team.ownerId === userId;
    const membership = team.members[0];
    const isAdmin = membership?.role === 'ADMIN' || membership?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only team owner or admin can connect Slack');
    }

    // Generate CSRF token and store in cookie
    const csrfToken = crypto.randomUUID();

    // Set cookie for CSRF protection
    void reply.setCookie('slack_csrf', csrfToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Redirect to Slack OAuth
    const installUrl = getSlackInstallUrl(teamId, csrfToken);
    return reply.redirect(installUrl);
  });

  // GET /callback - OAuth callback from Slack
  app.get(
    '/callback',
    {
      config: {
        /* Rate limiting: 20 requests per minute per IP (CodeQL: rateLimit via @fastify/rate-limit) */
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const queryResult = CallbackQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        throw new ValidationError('Invalid OAuth callback parameters');
      }

      const { code, state: stateJson } = queryResult.data;

      // Parse state
      let state: { teamId: string; csrf: string };
      try {
        state = JSON.parse(stateJson) as { teamId: string; csrf: string };
      } catch {
        throw new ValidationError('Invalid state parameter');
      }

      // Verify CSRF token
      const csrfCookie = request.cookies.slack_csrf;
      if (!csrfCookie || csrfCookie !== state.csrf) {
        throw new ForbiddenError('Invalid CSRF token');
      }

      // Clear CSRF cookie
      void reply.clearCookie('slack_csrf');

      // Exchange code for token
      const result = await handleSlackOAuthCallback(code, state.teamId);

      logger.info(
        { teamId: state.teamId, slackWorkspaceId: result.slackWorkspaceId },
        'Slack OAuth completed'
      );

      // Redirect to success page (or return JSON in dev)
      if (env.NODE_ENV === 'development') {
        return reply.send({
          success: true,
          message: `Connected to Slack workspace: ${result.slackTeamName}`,
          slackWorkspaceId: result.slackWorkspaceId,
        });
      }

      // In production, redirect to dashboard
      return reply.redirect(
        `https://devradar.io/dashboard/team/${state.teamId}/settings?slack=connected`
      );
    }
  );

  // POST /commands - Handle slash commands (e.g., /devradar status)
  app.post(
    '/commands',
    {
      config: {
        /* Rate limiting: 60 requests per minute per IP (CodeQL: rateLimit via @fastify/rate-limit) */
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify Slack signature
      if (!env.SLACK_SIGNING_SECRET) {
        throw new ForbiddenError('Slack signing secret not configured');
      }

      const timestamp = request.headers['x-slack-request-timestamp'] as string;
      const signature = request.headers['x-slack-signature'] as string;

      // Use raw body for signature verification
      const bodyString = request.body as string;

      if (!timestamp || !signature) {
        throw new ForbiddenError('Missing Slack signature headers');
      }

      if (!verifySlackRequest(env.SLACK_SIGNING_SECRET, timestamp, bodyString, signature)) {
        throw new ForbiddenError('Invalid Slack signature');
      }

      // Parse form data from validated raw body
      const searchParams = new URLSearchParams(bodyString);
      const payload = Object.fromEntries(searchParams.entries()) as unknown as SlashCommandPayload;

      const command = payload.command;
      const text = payload.text.trim().toLowerCase();

      logger.info(
        {
          command,
          text,
          slackTeamId: payload.team_id,
          userId: payload.user_id,
        },
        'Slash command received'
      );

      // Handle /devradar command
      if (command === '/devradar') {
        if (text === 'status' || text === '') {
          // Find team by Slack workspace ID
          const workspace = await db.slackWorkspace.findFirst({
            where: { slackWorkspaceId: payload.team_id },
            select: { teamId: true },
          });

          if (!workspace) {
            return reply.send({
              response_type: 'ephemeral',
              text: '❌ This Slack workspace is not connected to a DevRadar team. Ask your team admin to connect DevRadar.',
            });
          }

          // Get team status
          const status = await getTeamStatus(workspace.teamId);
          const blocks = formatStatusForSlack(status);

          // Respond in channel
          return reply.send({
            response_type: 'in_channel',
            blocks,
            text: `Team Status: ${String(status.online.length)} online, ${String(status.idle.length)} idle, ${String(status.offline.length)} offline`,
          });
        }

        if (text === 'help') {
          return reply.send({
            response_type: 'ephemeral',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*DevRadar Commands*\n\n`/devradar status` - Show team member statuses\n`/devradar help` - Show this help message',
                },
              },
            ],
          });
        }

        // Unknown subcommand
        return reply.send({
          response_type: 'ephemeral',
          text: `Unknown command: \`${text}\`. Use \`/devradar help\` for available commands.`,
        });
      }

      // Unknown command
      return reply.send({
        response_type: 'ephemeral',
        text: 'Unknown command',
      });
    }
  );

  // POST /events - Handle Slack events (future use)
  app.post(
    '/events',
    {
      config: {
        /* Rate limiting: 60 requests per minute per IP (CodeQL: rateLimit via @fastify/rate-limit) */
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify Slack signature for other events
      if (!env.SLACK_SIGNING_SECRET) {
        throw new ForbiddenError('Slack signing secret not configured');
      }

      const timestamp = request.headers['x-slack-request-timestamp'] as string;
      const signature = request.headers['x-slack-signature'] as string;
      const bodyString = JSON.stringify(request.body);

      if (!timestamp || !signature) {
        throw new ForbiddenError('Missing Slack signature headers');
      }

      if (!verifySlackRequest(env.SLACK_SIGNING_SECRET, timestamp, bodyString, signature)) {
        throw new ForbiddenError('Invalid Slack signature');
      }

      // Handle URL verification challenge after signature validation
      const body = request.body as { type?: string; challenge?: string };
      if (body.type === 'url_verification' && body.challenge) {
        return reply.send({ challenge: body.challenge });
      }

      // Acknowledge event (Slack requires response within 3 seconds)
      // Actual event processing should be done asynchronously
      logger.debug({ event: body }, 'Slack event received');

      return reply.status(200).send();
    }
  );

  // GET /status - Get connection status for a team
  app.get(
    '/status/:teamId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({
        teamId: z.string().min(1),
      });

      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const { teamId } = paramsResult.data;

      const workspace = await db.slackWorkspace.findUnique({
        where: { teamId },
        select: {
          slackWorkspaceId: true,
          slackTeamName: true,
          channelId: true,
          createdAt: true,
        },
      });

      if (!workspace) {
        return reply.send({
          connected: false,
        });
      }

      return reply.send({
        connected: true,
        slackWorkspaceId: workspace.slackWorkspaceId,
        slackTeamName: workspace.slackTeamName,
        channelId: workspace.channelId,
        connectedAt: workspace.createdAt.toISOString(),
      });
    }
  );

  // DELETE /disconnect/:teamId - Disconnect Slack workspace
  app.delete(
    '/disconnect/:teamId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsSchema = z.object({
        teamId: z.string().min(1),
      });

      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const { teamId } = paramsResult.data;

      // Verify user is team owner
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });

      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      if (team.ownerId !== userId) {
        throw new ForbiddenError('Only team owner can disconnect Slack');
      }

      // Delete workspace connection
      await db.slackWorkspace.delete({
        where: { teamId },
      });

      logger.info({ teamId, userId }, 'Slack workspace disconnected');

      return reply.status(204).send();
    }
  );
}
