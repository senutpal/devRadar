/**
 * Webhooks Routes
 *
 * GitHub webhook handler for Gamification (achievement system).
 * - HMAC-SHA256 signature verification (X-Hub-Signature-256)
 * - Constant-time comparison (crypto.timingSafeEqual)
 * - Raw body access before JSON parsing
 * - Idempotency protection via unique constraints
 */

import crypto from 'crypto';

import { ACHIEVEMENTS, REDIS_KEYS } from '@devradar/shared';
import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { env } from '@/config';
import { PrismaClientKnownRequestError } from '@/generated/prisma/internal/prismaNamespace';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { getRedis } from '@/services/redis';
import { broadcastToUsers } from '@/ws/handler';

/** Extended request with raw body for signature verification. */
interface RawBodyRequest extends FastifyRequest {
  rawBody?: string | Buffer;
}

/** Zod schema for GitHub Issues webhook payload. */
const GitHubIssuesPayloadSchema = z.object({
  action: z.string(),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
  }),
  sender: z.object({ id: z.number(), login: z.string() }),
  repository: z.object({ full_name: z.string() }),
});

/** Zod schema for GitHub Push webhook payload (minimal - only what's needed for counting). */
const GitHubPushPayloadSchema = z.object({
  commits: z.array(
    z.object({
      id: z.string(),
    })
  ),
  sender: z.object({ id: z.number() }),
  repository: z.object({ full_name: z.string() }),
});

/** Zod schema for GitHub Pull Request webhook payload. */
const GitHubPullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
    merged: z.boolean(),
  }),
  sender: z.object({ id: z.number(), login: z.string() }),
  repository: z.object({ full_name: z.string() }),
});

/**
 * Safely extract a header value from a request.
 * Handles both string and string[] cases (takes first element if array).
 */
function getHeader(req: FastifyRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * Returns true if valid, false otherwise.
 */
function verifyGitHubSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  // Trim and validate signature format
  const sig = signature.trim();
  if (!sig.startsWith('sha256=')) {
    return false;
  }

  // Calculate expected signature
  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison to prevent timing attacks (explicit utf8 encoding)
  const signatureBuffer = Buffer.from(sig, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

/** Type guard to check if an error is a Prisma unique constraint violation (P2002). */
function isPrismaUniqueConstraintError(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Registers webhook routes on the Fastify instance. */
export function webhookRoutes(app: FastifyInstance): void {
  const db = getDb();

  /**
   * POST /webhooks/github - GitHub webhook handler
   *
   * Events handled:
   * - issues (closed) → ISSUE_CLOSED achievement
   * - pull_request (merged) → PR_MERGED achievement
   * - push → Increment commit count in leaderboard
   */
  app.post(
    '/github',
    {
      config: {
        // Generous rate limit for webhooks - protects against DoS while
        // accommodating GitHub's webhook delivery (GitHub IPs may vary)
        rateLimit: {
          max: 100,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawRequest = request as RawBodyRequest;
      if (!rawRequest.rawBody) {
        logger.error('Raw body not available - server misconfiguration');
        return reply.status(400).send({
          error: 'Raw body required for signature verification. Server misconfiguration.',
        });
      }
      const rawBody =
        typeof rawRequest.rawBody === 'string'
          ? Buffer.from(rawRequest.rawBody)
          : rawRequest.rawBody;

      const signature = getHeader(request, 'x-hub-signature-256');
      const event = getHeader(request, 'x-github-event');
      const deliveryId = getHeader(request, 'x-github-delivery');

      if (!signature || !event) {
        logger.warn({ deliveryId }, 'Missing GitHub webhook headers');
        return reply.status(401).send({ error: 'Missing signature or event header' });
      }

      const secret = env.GITHUB_WEBHOOK_SECRET;

      if (!secret) {
        logger.error('GITHUB_WEBHOOK_SECRET not configured');
        return reply.status(500).send({ error: 'Webhook secret not configured' });
      }

      if (!verifyGitHubSignature(rawBody, signature, secret)) {
        logger.warn({ deliveryId }, 'Invalid GitHub webhook signature');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      // 3. Dedupe deliveries using Redis (GitHub delivery IDs are globally unique)
      if (deliveryId) {
        const redis = getRedis();
        const dedupeKey = `${REDIS_KEYS.webhookDelivery}:${deliveryId}`;
        const setResult = await redis.set(dedupeKey, '1', 'EX', 60 * 60 * 24, 'NX');
        if (setResult !== 'OK') {
          logger.info({ deliveryId, event }, 'Duplicate GitHub webhook delivery ignored');
          return reply.send({ received: true, deduped: true });
        }
      }

      logger.info({ event, deliveryId }, 'Processing GitHub webhook');

      // 3. Handle events with Zod validation
      const payload = request.body;

      try {
        switch (event) {
          case 'issues': {
            const parsed = GitHubIssuesPayloadSchema.safeParse(payload);
            if (!parsed.success) {
              logger.warn({ error: parsed.error.message, deliveryId }, 'Invalid issues payload');
              break;
            }
            await handleIssuesEvent(parsed.data);
            break;
          }

          case 'pull_request': {
            const parsed = GitHubPullRequestPayloadSchema.safeParse(payload);
            if (!parsed.success) {
              logger.warn(
                { error: parsed.error.message, deliveryId },
                'Invalid pull_request payload'
              );
              break;
            }
            await handlePullRequestEvent(parsed.data);
            break;
          }

          case 'push': {
            const parsed = GitHubPushPayloadSchema.safeParse(payload);
            if (!parsed.success) {
              logger.warn({ error: parsed.error.message, deliveryId }, 'Invalid push payload');
              break;
            }
            await handlePushEvent(parsed.data);
            break;
          }

          case 'ping':
            logger.info({ deliveryId }, 'GitHub webhook ping received');
            break;

          default:
            logger.debug({ event, deliveryId }, 'Unhandled GitHub event type');
        }
      } catch (error) {
        logger.error({ error, event, deliveryId }, 'Error processing GitHub webhook');
        // Still return 200 to avoid GitHub retries for app errors
      }

      return reply.send({ received: true });
    }
  );

  /**
   * Handle issues event - Award achievements for closed issues
   */
  async function handleIssuesEvent(
    payload: z.infer<typeof GitHubIssuesPayloadSchema>
  ): Promise<void> {
    if (payload.action !== 'closed') {
      return;
    }

    const { sender, issue, repository } = payload;

    // Find user by GitHub ID
    const user = await db.user.findUnique({
      where: { githubId: String(sender.id) },
      select: {
        id: true,
        username: true,
        displayName: true,
        followers: { select: { followerId: true } },
      },
    });

    if (!user) {
      logger.debug({ githubId: sender.id }, 'User not found for GitHub webhook');
      return;
    }

    // Check for existing achievement to avoid duplicate key errors
    const existingAchievement = await db.achievement.findFirst({
      where: {
        userId: user.id,
        type: 'ISSUE_CLOSED',
        metadata: { path: ['issueNumber'], equals: issue.number },
      },
    });

    if (existingAchievement) {
      logger.debug(
        { userId: user.id, issueNumber: issue.number },
        'Achievement already exists for this issue'
      );
      return;
    }

    // Create achievement (with race condition protection)
    const achievementDef = ACHIEVEMENTS.ISSUE_CLOSED;

    try {
      const achievement = await db.achievement.create({
        data: {
          userId: user.id,
          type: 'ISSUE_CLOSED',
          title: achievementDef.title,
          description: `Closed issue #${String(issue.number)} in ${repository.full_name}`,
          metadata: {
            issueNumber: issue.number,
            issueTitle: issue.title,
            issueUrl: issue.html_url,
            repository: repository.full_name,
          },
        },
      });

      logger.info(
        { userId: user.id, achievementId: achievement.id },
        'Bug Slayer achievement earned'
      );

      // Broadcast to followers and self
      const followerIds = user.followers.map((f) => f.followerId);

      broadcastToUsers([...followerIds, user.id], 'ACHIEVEMENT', {
        achievement: {
          id: achievement.id,
          type: 'ISSUE_CLOSED',
          title: achievementDef.title,
          description: achievement.description,
          earnedAt: achievement.earnedAt.toISOString(),
        },
        userId: user.id,
        username: user.username,
      });
    } catch (error) {
      // Ignore unique constraint violations (P2002) from race conditions
      if (isPrismaUniqueConstraintError(error)) {
        logger.debug(
          { userId: user.id, issueNumber: issue.number },
          'Achievement already exists (race condition handled)'
        );
        return;
      }
      throw error;
    }
  }

  async function handlePullRequestEvent(
    payload: z.infer<typeof GitHubPullRequestPayloadSchema>
  ): Promise<void> {
    // Only handle merged PRs
    if (payload.action !== 'closed' || !payload.pull_request.merged) {
      return;
    }

    const { sender, pull_request, repository } = payload;

    // Find user by GitHub ID
    const user = await db.user.findUnique({
      where: { githubId: String(sender.id) },
      select: {
        id: true,
        username: true,
        displayName: true,
        followers: { select: { followerId: true } },
      },
    });

    if (!user) {
      logger.debug({ githubId: sender.id }, 'User not found for GitHub webhook');
      return;
    }

    // Check for existing achievement to avoid duplicate key errors
    const existingAchievement = await db.achievement.findFirst({
      where: {
        userId: user.id,
        type: 'PR_MERGED',
        metadata: { path: ['prNumber'], equals: pull_request.number },
      },
    });

    if (existingAchievement) {
      logger.debug(
        { userId: user.id, prNumber: pull_request.number },
        'Achievement already exists for this PR'
      );
      return;
    }

    // Create achievement (with race condition protection)
    const achievementDef = ACHIEVEMENTS.PR_MERGED;

    try {
      const achievement = await db.achievement.create({
        data: {
          userId: user.id,
          type: 'PR_MERGED',
          title: achievementDef.title,
          description: `Merged PR #${String(pull_request.number)} in ${repository.full_name}`,
          metadata: {
            prNumber: pull_request.number,
            prTitle: pull_request.title,
            prUrl: pull_request.html_url,
            repository: repository.full_name,
          },
        },
      });

      logger.info(
        { userId: user.id, achievementId: achievement.id },
        'Merge Master achievement earned'
      );

      // Broadcast to followers and self
      const followerIds = user.followers.map((f) => f.followerId);

      broadcastToUsers([...followerIds, user.id], 'ACHIEVEMENT', {
        achievement: {
          id: achievement.id,
          type: 'PR_MERGED',
          title: achievementDef.title,
          description: achievement.description,
          earnedAt: achievement.earnedAt.toISOString(),
        },
        userId: user.id,
        username: user.username,
      });
    } catch (error) {
      // Ignore unique constraint violations (P2002) from race conditions
      if (isPrismaUniqueConstraintError(error)) {
        logger.debug(
          { userId: user.id, prNumber: pull_request.number },
          'Achievement already exists (race condition handled)'
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Handle push event - Track commit counts for leaderboard
   */
  async function handlePushEvent(payload: z.infer<typeof GitHubPushPayloadSchema>): Promise<void> {
    const { sender, commits } = payload;
    const commitCount = commits.length;

    if (commitCount === 0) {
      return;
    }

    // Find user by GitHub ID
    const user = await db.user.findUnique({
      where: { githubId: String(sender.id) },
      select: { id: true },
    });

    if (!user) {
      return;
    }

    // Update commit leaderboard
    const redis = getRedis();
    await redis.zincrby(REDIS_KEYS.weeklyLeaderboard('commits'), commitCount, user.id);

    logger.debug({ userId: user.id, commitCount }, 'Recorded commits from GitHub push');
  }
}
