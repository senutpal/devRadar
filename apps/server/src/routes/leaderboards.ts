/**
 * Leaderboards Routes
 *
 * Real-time leaderboards using Redis Sorted Sets.
 *
 * Best Practices Implemented:
 * - ZREVRANGE with pagination (never fetch all 0 -1)
 * - ZREVRANK for efficient O(log N) rank lookup
 * - Cache headers for client-side caching
 * - Friends-only filtering with efficient score fetching
 */

import { REDIS_KEYS, NETWORK_HOT_THRESHOLD } from '@devradar/shared';
import { z } from 'zod';

import type { LeaderboardEntry, NetworkActivity } from '@devradar/shared';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { getDb } from '@/services/db';
import { getRedis } from '@/services/redis';

/** Pagination query schema. */
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/** User info for leaderboard display. */
interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Registers leaderboard routes on the Fastify instance. */
export function leaderboardRoutes(app: FastifyInstance): void {
  const db = getDb();

  /**
   * GET /leaderboards/weekly/time - Top users by coding time this week
   */
  app.get('/weekly/time', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { page, limit } = PaginationSchema.parse(request.query);
    const redis = getRedis();

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Get leaderboard entries with scores (WITHSCORES returns alternating member, score)
    const entries = await redis.zrevrange(REDIS_KEYS.weeklyLeaderboard('time'), start, end, 'WITHSCORES');

    // Get total count for pagination
    const total = await redis.zcard(REDIS_KEYS.weeklyLeaderboard('time'));

    // Get current user's rank
    const myRank = await redis.zrevrank(REDIS_KEYS.weeklyLeaderboard('time'), userId);

    // Extract user IDs from entries (even indices: 0, 2, 4...)
    const userIds: string[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const entryUserId = entries[i];
      if (entryUserId) {
        userIds.push(entryUserId);
      }
    }

    if (userIds.length === 0) {
      return reply.send({
        data: {
          leaderboard: [],
          myRank: myRank !== null ? myRank + 1 : null,
          pagination: { page, limit, total, hasMore: false },
        },
      });
    }

    // Fetch user details
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    const userMap = new Map<string, UserInfo>(users.map((u) => [u.id, u]));

    // Get user's friends for "isFriend" flag
    const friends = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = new Set(friends.map((f) => f.followingId));

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = userIds.map((id, index) => {
      const user = userMap.get(id);
      const scoreStr = entries[index * 2 + 1];
      const score = scoreStr ? parseInt(scoreStr, 10) : 0;

      return {
        rank: start + index + 1,
        userId: id,
        username: user?.username ?? 'Unknown',
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        score,
        isFriend: friendIds.has(id),
      };
    });

    // Set cache headers (1 minute cache for non-real-time efficiency)
    reply.header('Cache-Control', 'public, max-age=60');

    return reply.send({
      data: {
        leaderboard,
        myRank: myRank !== null ? myRank + 1 : null,
        pagination: {
          page,
          limit,
          total,
          hasMore: start + limit < total,
        },
      },
    });
  });

  /**
   * GET /leaderboards/weekly/commits - Top users by commit count this week
   */
  app.get('/weekly/commits', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { page, limit } = PaginationSchema.parse(request.query);
    const redis = getRedis();

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Get leaderboard entries with scores
    const entries = await redis.zrevrange(REDIS_KEYS.weeklyLeaderboard('commits'), start, end, 'WITHSCORES');
    const total = await redis.zcard(REDIS_KEYS.weeklyLeaderboard('commits'));
    const myRank = await redis.zrevrank(REDIS_KEYS.weeklyLeaderboard('commits'), userId);

    // Extract user IDs
    const userIds: string[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const entryUserId = entries[i];
      if (entryUserId) {
        userIds.push(entryUserId);
      }
    }

    if (userIds.length === 0) {
      return reply.send({
        data: {
          leaderboard: [],
          myRank: myRank !== null ? myRank + 1 : null,
          pagination: { page, limit, total, hasMore: false },
        },
      });
    }

    // Fetch user details and friends
    const [users, friends] = await Promise.all([
      db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      }),
      db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
    ]);

    const userMap = new Map<string, UserInfo>(users.map((u) => [u.id, u]));
    const friendIds = new Set(friends.map((f) => f.followingId));

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = userIds.map((id, index) => {
      const user = userMap.get(id);
      const scoreStr = entries[index * 2 + 1];
      const score = scoreStr ? parseInt(scoreStr, 10) : 0;

      return {
        rank: start + index + 1,
        userId: id,
        username: user?.username ?? 'Unknown',
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        score,
        isFriend: friendIds.has(id),
      };
    });

    reply.header('Cache-Control', 'public, max-age=60');

    return reply.send({
      data: {
        leaderboard,
        myRank: myRank !== null ? myRank + 1 : null,
        pagination: { page, limit, total, hasMore: start + limit < total },
      },
    });
  });

  /**
   * GET /leaderboards/friends - Friends-only leaderboard by coding time
   */
  app.get('/friends', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const redis = getRedis();

    // Get user's friends
    const friends = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = friends.map((f) => f.followingId);

    // Include self in the leaderboard
    const allIds = [...friendIds, userId];

    if (allIds.length === 1) {
      // Only self, get own score
      const myScore = await redis.zscore(REDIS_KEYS.weeklyLeaderboard('time'), userId);
      const myUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (!myUser || !myScore) {
        return reply.send({ data: { leaderboard: [], myRank: null } });
      }

      return reply.send({
        data: {
          leaderboard: [
            {
              rank: 1,
              userId,
              username: myUser.username,
              displayName: myUser.displayName,
              avatarUrl: myUser.avatarUrl,
              score: parseInt(myScore, 10),
              isFriend: false,
            },
          ],
          myRank: 1,
        },
      });
    }

    // Get scores for all friends using pipeline
    const pipeline = redis.pipeline();
    for (const id of allIds) {
      pipeline.zscore(REDIS_KEYS.weeklyLeaderboard('time'), id);
    }
    const results = await pipeline.exec();

    // Build score map
    const scoreMap: { userId: string; score: number }[] = [];
    for (let i = 0; i < allIds.length; i++) {
      const id = allIds[i];
      const result = results?.[i];
      const score = result?.[1] ? parseInt(result[1] as string, 10) : 0;
      if (id && score > 0) {
        scoreMap.push({ userId: id, score });
      }
    }

    // Sort by score descending
    scoreMap.sort((a, b) => b.score - a.score);

    if (scoreMap.length === 0) {
      return reply.send({ data: { leaderboard: [], myRank: null } });
    }

    // Get user details
    const users = await db.user.findMany({
      where: { id: { in: scoreMap.map((s) => s.userId) } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    const userMap = new Map<string, UserInfo>(users.map((u) => [u.id, u]));

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = scoreMap.map((s, index) => {
      const user = userMap.get(s.userId);
      return {
        rank: index + 1,
        userId: s.userId,
        username: user?.username ?? 'Unknown',
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        score: s.score,
        isFriend: s.userId !== userId,
      };
    });

    const myRank = leaderboard.findIndex((e) => e.userId === userId) + 1;

    return reply.send({
      data: {
        leaderboard,
        myRank: myRank > 0 ? myRank : null,
      },
    });
  });

  /**
   * GET /leaderboards/network-activity - Current network activity (heatmap data)
   */
  app.get('/network-activity', { onRequest: [app.authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const redis = getRedis();
    const currentMinute = Math.floor(Date.now() / 60000);

    // Get last 5 minutes of activity using pipeline
    const pipeline = redis.pipeline();
    for (let i = 0; i < 5; i++) {
      pipeline.hgetall(REDIS_KEYS.networkIntensity(currentMinute - i));
    }
    const results = await pipeline.exec();

    // Aggregate active users and languages
    let totalActiveUsers = 0;
    const languageCounts = new Map<string, number>();

    if (results) {
      for (const result of results) {
        const data = result[1] as Record<string, string> | null;
        if (data) {
          if (data.count) {
            totalActiveUsers += parseInt(data.count, 10);
          }
          // Aggregate language counts
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('lang:')) {
              const lang = key.slice(5);
              languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + parseInt(value, 10));
            }
          }
        }
      }
    }

    // Calculate intensity (0-100 scale)
    const averageIntensity = Math.min(100, totalActiveUsers * 10);
    const isHot = totalActiveUsers >= NETWORK_HOT_THRESHOLD;

    // Get top languages
    const topLanguages = Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }));

    const networkActivity: NetworkActivity = {
      totalActiveUsers,
      averageIntensity,
      isHot,
      message: isHot
        ? 'Your network is 🔥 active right now!'
        : `${String(totalActiveUsers)} developer${totalActiveUsers !== 1 ? 's' : ''} coding`,
    };

    // Short cache for real-time feel
    reply.header('Cache-Control', 'public, max-age=10');

    return reply.send({
      data: {
        ...networkActivity,
        topLanguages,
      },
    });
  });
}
