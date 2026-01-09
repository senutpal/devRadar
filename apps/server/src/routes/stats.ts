/**
 * Stats Routes
 *
 * Endpoints for user statistics, streaks, and session tracking.
 * - Redis pipelining for batch operations
 * - TTL-based streak expiration with grace period (25 hours)
 * - Efficient HINCRBY for atomic updates
 * - Deduplication to prevent stat inflation
 */

import {
  REDIS_KEYS,
  STREAK_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  NETWORK_ACTIVITY_TTL_SECONDS,
  ACHIEVEMENTS,
} from '@devradar/shared';
import { z } from 'zod';

import type { StreakInfo, WeeklyStatsDTO, AchievementDTO } from '@devradar/shared';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { getRedis } from '@/services/redis';
import { broadcastToUsers } from '@/ws/handler';

/** Schema for session recording payload. */
const SessionPayloadSchema = z.object({
  sessionDuration: z.number().int().min(0).max(86400), // Max 24 hours
  language: z.string().max(255).optional(),
  project: z.string().max(255).optional(),
});

/** Schema for achievements query with pagination. */
const AchievementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Allowlist of known programming languages to prevent unbounded Redis hash growth. */
const LANGUAGE_ALLOWLIST = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'c',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'scss',
  'less',
  'json',
  'yaml',
  'xml',
  'sql',
  'shell',
  'markdown',
  'vue',
  'react',
  'angular',
  'svelte',
  'dart',
  'r',
  'lua',
  'perl',
  'haskell',
  'elixir',
  'clojure',
  'fsharp',
  'ocaml',
]);

/** Get Monday 00:00:00 UTC for current week. */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Get today's date in YYYY-MM-DD format (UTC). */
function getTodayDate(): string {
  const parts = new Date().toISOString().split('T');
  return parts[0] ?? '';
}

/** Calculate streak status based on last active date. */
function calculateStreakStatus(lastActiveDate: string | null): StreakInfo['streakStatus'] {
  if (!lastActiveDate) return 'broken';

  const lastDate = new Date(lastActiveDate);
  const today = new Date(getTodayDate());
  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 'active';
  if (daysDiff === 1) return 'at_risk';
  return 'broken';
}

/** Get yesterday's date in YYYY-MM-DD format (UTC) for Lua script timezone safety. */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const parts = yesterday.toISOString().split('T');
  return parts[0] ?? '';
}

/** Parse streak data from Redis hgetall result into StreakInfo. */
function parseStreakData(data: Record<string, string> | null): StreakInfo {
  const currentStreak = parseInt(data?.count ?? '0', 10);
  const longestStreak = parseInt(data?.longest ?? '0', 10);
  const lastActiveDate = data?.lastDate ?? null;
  const streakStatus = calculateStreakStatus(lastActiveDate);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    isActiveToday: streakStatus === 'active',
    streakStatus,
  };
}

/** Registers stats routes on the Fastify instance. */
export function statsRoutes(app: FastifyInstance): void {
  const db = getDb();

  /**
   * GET /stats/me - Get current user's stats summary
   */
  app.get(
    '/me',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const redis = getRedis();

      // Pipeline Redis reads for efficiency
      const pipeline = redis.pipeline();
      const today = getTodayDate();

      pipeline.hgetall(REDIS_KEYS.streakData(userId));
      pipeline.get(REDIS_KEYS.dailySession(userId, today));

      const results = await pipeline.exec();

      // Check for pipeline errors
      const streakError = results?.[0]?.[0];
      const sessionError = results?.[1]?.[0];
      if (streakError || sessionError) {
        logger.error({ streakError, sessionError, userId }, 'Redis pipeline error in stats/me');
      }

      const streakData = results?.[0]?.[1] as Record<string, string> | null;
      const todaySessionStr = results?.[1]?.[1] as string | null;
      const todaySession = todaySessionStr ? parseInt(todaySessionStr, 10) : 0;

      // Build streak info using shared helper
      const streak = parseStreakData(streakData);

      // Get weekly stats from PostgreSQL
      const weekStart = getWeekStart();
      const weeklyStatsRecord = await db.weeklyStats.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      });

      // Get user's rank in weekly leaderboard
      const rank = await redis.zrevrank(REDIS_KEYS.weeklyLeaderboard('time'), userId);
      const liveScore = await redis.zscore(REDIS_KEYS.weeklyLeaderboard('time'), userId);

      const weeklyStats: WeeklyStatsDTO | null = weeklyStatsRecord
        ? {
            weekStart: weeklyStatsRecord.weekStart.toISOString(),
            totalSeconds: liveScore ? parseInt(liveScore, 10) : weeklyStatsRecord.totalSeconds,
            totalSessions: weeklyStatsRecord.totalSessions,
            totalCommits: weeklyStatsRecord.totalCommits,
            topLanguage: weeklyStatsRecord.topLanguage,
            topProject: weeklyStatsRecord.topProject,
            rank: rank !== null ? rank + 1 : undefined,
          }
        : null;

      // Get recent achievements
      const achievementRecords = await db.achievement.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
        take: 5,
      });

      const recentAchievements: AchievementDTO[] = achievementRecords.map((a) => ({
        id: a.id,
        type: a.type as AchievementDTO['type'],
        title: a.title,
        description: a.description,
        earnedAt: a.earnedAt.toISOString(),
      }));

      return reply.send({
        data: {
          streak,
          todaySession,
          weeklyStats,
          recentAchievements,
        },
      });
    }
  );

  /**
   * GET /stats/streak - Get detailed streak information
   */
  app.get(
    '/streak',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const redis = getRedis();

      const streakData = await redis.hgetall(REDIS_KEYS.streakData(userId));
      const streak = parseStreakData(streakData);

      return reply.send({ data: streak });
    }
  );

  /**
   * POST /stats/session - Record coding session time
   * Called periodically by the extension with session duration increment
   */
  app.post(
    '/session',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const result = SessionPayloadSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'INVALID_PAYLOAD', message: 'Invalid session data' },
        });
      }

      const { sessionDuration, language, project } = result.data;
      const today = getTodayDate();
      const yesterday = getYesterdayDate();
      const redis = getRedis();

      // Lua script for atomic streak update (UTC-safe: uses string comparison)
      // Returns: [newStreak, shouldCheckAchievements] - 1 if streak was updated, 0 otherwise
      const STREAK_UPDATE_SCRIPT = `
      local streakKey = KEYS[1]
      local today = ARGV[1]
      local streakTtl = tonumber(ARGV[2])
      local yesterday = ARGV[3]

      -- Read current streak data
      local lastDate = redis.call('HGET', streakKey, 'lastDate')
      local count = tonumber(redis.call('HGET', streakKey, 'count') or '0')
      local longest = tonumber(redis.call('HGET', streakKey, 'longest') or '0')

      -- Check if already updated today
      if lastDate == today then
        return {count, 0}
      end

      -- Calculate new streak using UTC-safe string comparison
      local newStreak = 1
      if lastDate == yesterday then
        newStreak = count + 1
      end
      -- Any other date means streak broken, reset to 1

      local newLongest = math.max(newStreak, longest)

      -- Update atomically
      redis.call('HSET', streakKey, 'count', newStreak, 'lastDate', today, 'longest', newLongest)
      redis.call('EXPIRE', streakKey, streakTtl)

      return {newStreak, 1}
    `;

      // Execute atomic streak update
      const streakKey = REDIS_KEYS.streakData(userId);
      const streakResult = (await redis.eval(
        STREAK_UPDATE_SCRIPT,
        1,
        streakKey,
        today,
        (STREAK_TTL_SECONDS * 2).toString(), // 50h TTL: 25h grace + 25h safety buffer
        yesterday
      )) as [number, number];

      const newStreak = streakResult[0];
      const shouldCheckStreakAchievements = streakResult[1] === 1;

      // Pipeline for remaining atomic operations
      const pipeline = redis.pipeline();

      // 1. Update daily session time (accumulate)
      const sessionKey = REDIS_KEYS.dailySession(userId, today);
      pipeline.incrby(sessionKey, sessionDuration);
      pipeline.expire(sessionKey, SESSION_TTL_SECONDS);

      // 2. Update weekly leaderboard score
      pipeline.zincrby(REDIS_KEYS.weeklyLeaderboard('time'), sessionDuration, userId);

      // 3. Update network activity (1-minute bucket for heatmap)
      const minute = Math.floor(Date.now() / 60000);
      pipeline.hincrby(REDIS_KEYS.networkIntensity(minute), 'count', 1);
      pipeline.expire(REDIS_KEYS.networkIntensity(minute), NETWORK_ACTIVITY_TTL_SECONDS);

      // 4. Track language if provided (validate to prevent unbounded hash growth)
      if (language) {
        const normalizedLang = language.toLowerCase().trim();
        const safeLang = LANGUAGE_ALLOWLIST.has(normalizedLang) ? normalizedLang : 'other';
        pipeline.hincrby(REDIS_KEYS.networkIntensity(minute), `lang:${safeLang}`, 1);
      }

      const pipelineResults = await pipeline.exec();

      // Check for pipeline errors
      if (pipelineResults) {
        for (let i = 0; i < pipelineResults.length; i++) {
          const [err] = pipelineResults[i] ?? [];
          if (err) {
            logger.error(
              { error: err, userId, commandIndex: i },
              'Redis pipeline error in session recording'
            );
          }
        }
      }

      // Check for streak achievements (with error handling)
      if (shouldCheckStreakAchievements) {
        checkStreakAchievements(userId, newStreak).catch((err: unknown) => {
          logger.error(
            { error: err, userId, streak: newStreak },
            'Failed to check streak achievements'
          );
        });
      }

      logger.debug({ userId, sessionDuration, language, project }, 'Recorded session');

      return reply.send({ data: { recorded: true } });
    }
  );

  /**
   * GET /stats/weekly - Get weekly statistics with real-time data
   */
  app.get(
    '/weekly',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const redis = getRedis();

      // Get current week stats from DB
      const weekStart = getWeekStart();
      const weeklyStatsRecord = await db.weeklyStats.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      });

      // Get real-time Redis data
      const [liveScore, rank] = await Promise.all([
        redis.zscore(REDIS_KEYS.weeklyLeaderboard('time'), userId),
        redis.zrevrank(REDIS_KEYS.weeklyLeaderboard('time'), userId),
      ]);

      const weeklyStats: WeeklyStatsDTO = {
        weekStart: weekStart.toISOString(),
        totalSeconds: liveScore ? parseInt(liveScore, 10) : (weeklyStatsRecord?.totalSeconds ?? 0),
        totalSessions: weeklyStatsRecord?.totalSessions ?? 0,
        totalCommits: weeklyStatsRecord?.totalCommits ?? 0,
        topLanguage: weeklyStatsRecord?.topLanguage ?? null,
        topProject: weeklyStatsRecord?.topProject ?? null,
        rank: rank !== null ? rank + 1 : undefined,
      };

      return reply.send({ data: weeklyStats });
    }
  );

  /**
   * GET /stats/achievements - Get all user achievements (paginated)
   */
  app.get(
    '/achievements',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const queryResult = AchievementsQuerySchema.safeParse(request.query);

      if (!queryResult.success) {
        return reply.status(400).send({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' },
        });
      }

      const { limit, cursor } = queryResult.data;

      const achievementRecords = await db.achievement.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
        take: limit + 1, // Fetch one extra to check if there's more
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1, // Skip the cursor item itself
        }),
      });

      const hasMore = achievementRecords.length > limit;
      const items = hasMore ? achievementRecords.slice(0, limit) : achievementRecords;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      const achievements: AchievementDTO[] = items.map((a) => ({
        id: a.id,
        type: a.type as AchievementDTO['type'],
        title: a.title,
        description: a.description,
        earnedAt: a.earnedAt.toISOString(),
      }));

      return reply.send({
        data: achievements,
        pagination: {
          hasMore,
          nextCursor,
        },
      });
    }
  );

  /**
   * Check and award streak achievements.
   */
  async function checkStreakAchievements(userId: string, streak: number): Promise<void> {
    // Milestones in descending order - highest applicable wins
    const milestones = [
      { streak: 100, type: 'STREAK_100' as const },
      { streak: 30, type: 'STREAK_30' as const },
      { streak: 7, type: 'STREAK_7' as const },
    ];

    for (const milestone of milestones) {
      if (streak >= milestone.streak) {
        // Check if already earned
        const existing = await db.achievement.findFirst({
          where: { userId, type: milestone.type },
        });

        if (!existing) {
          const achievementDef = ACHIEVEMENTS[milestone.type];

          const achievement = await db.achievement.create({
            data: {
              userId,
              type: milestone.type,
              title: achievementDef.title,
              description: achievementDef.description,
            },
          });

          // Get user info for broadcast
          const user = await db.user.findUnique({
            where: { id: userId },
            select: {
              username: true,
              followers: { select: { followerId: true } },
            },
          });

          if (user) {
            const followerIds = user.followers.map((f) => f.followerId);

            broadcastToUsers([...followerIds, userId], 'ACHIEVEMENT', {
              achievement: {
                id: achievement.id,
                type: milestone.type,
                title: achievementDef.title,
                description: achievementDef.description,
                earnedAt: achievement.earnedAt.toISOString(),
              },
              userId,
              username: user.username,
            });

            logger.info({ userId, streak, type: milestone.type }, 'Streak achievement earned');
          }
        }
        // Continue checking for lower milestones that may not have been awarded
      }
    }
  }
}
