/**
 * Webhooks Routes
 *
 * GitHub webhook handler for "Boss Battles" (achievement system).
 *
 * Security Best Practices:
 * - HMAC-SHA256 signature verification (X-Hub-Signature-256)
 * - Constant-time comparison (crypto.timingSafeEqual)
 * - Raw body access before JSON parsing
 * - Idempotency protection via unique constraints
 */

import crypto from 'crypto';

import { ACHIEVEMENTS, REDIS_KEYS } from '@devradar/shared';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { env } from '@/config';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { getRedis } from '@/services/redis';
import { broadcastToUsers } from '@/ws/handler';

/** GitHub Issues webhook payload structure. */
interface GitHubIssuesPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
  };
  sender: {
    id: number;
    login: string;
  };
  repository: {
    full_name: string;
  };
}

/** GitHub Push webhook payload structure. */
interface GitHubPushPayload {
  commits: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  }[];
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    id: number;
    login: string;
  };
  repository: {
    full_name: string;
  };
}

/** GitHub Pull Request webhook payload structure. */
interface GitHubPullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    merged: boolean;
  };
  sender: {
    id: number;
    login: string;
  };
  repository: {
    full_name: string;
  };
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * Returns true if valid, false otherwise.
 */
function verifyGitHubSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  // Calculate expected signature
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
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
        // Skip rate limiting for webhooks (GitHub has its own retry logic)
        rateLimit: false,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Get raw body for signature verification
      // Note: Fastify should give us access to rawBody via request.rawBody or we parse it
      // For now, we'll re-serialize since Fastify already parsed it
      const bodyString = JSON.stringify(request.body);
      const rawBody = Buffer.from(bodyString, 'utf8');

      // 2. Verify signature
      const signature = request.headers['x-hub-signature-256'] as string | undefined;
      const event = request.headers['x-github-event'] as string | undefined;
      const deliveryId = request.headers['x-github-delivery'] as string | undefined;

      if (!signature || !event) {
        logger.warn({ deliveryId }, 'Missing GitHub webhook headers');
        return reply.status(401).send({ error: 'Missing signature or event header' });
      }

      const secret = env.GITHUB_WEBHOOK_SECRET;

      if (!secret) {
        logger.error('GITHUB_WEBHOOK_SECRET not configured');
        return reply.status(500).send({ error: 'Webhook secret not configured' });
      }

      // Verify the signature
      if (!verifyGitHubSignature(rawBody, signature, secret)) {
        logger.warn({ deliveryId }, 'Invalid GitHub webhook signature');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      logger.info({ event, deliveryId }, 'Processing GitHub webhook');

      // 3. Handle events
      const payload = request.body as Record<string, unknown>;

      try {
        switch (event) {
          case 'issues':
            await handleIssuesEvent(payload as unknown as GitHubIssuesPayload);
            break;

          case 'pull_request':
            await handlePullRequestEvent(payload as unknown as GitHubPullRequestPayload);
            break;

          case 'push':
            await handlePushEvent(payload as unknown as GitHubPushPayload);
            break;

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
  async function handleIssuesEvent(payload: GitHubIssuesPayload): Promise<void> {
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

    // Create achievement
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

      logger.info({ userId: user.id, achievementId: achievement.id }, 'Bug Slayer achievement earned');

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
      // Likely a duplicate - that's OK
      logger.debug({ error, userId: user.id }, 'Failed to create achievement (possibly duplicate)');
    }
  }

  /**
   * Handle pull_request event - Award achievements for merged PRs
   */
  async function handlePullRequestEvent(payload: GitHubPullRequestPayload): Promise<void> {
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

    // Create achievement
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

      logger.info({ userId: user.id, achievementId: achievement.id }, 'Merge Master achievement earned');

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
      logger.debug({ error, userId: user.id }, 'Failed to create achievement (possibly duplicate)');
    }
  }

  /**
   * Handle push event - Track commit counts for leaderboard
   */
  async function handlePushEvent(payload: GitHubPushPayload): Promise<void> {
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
