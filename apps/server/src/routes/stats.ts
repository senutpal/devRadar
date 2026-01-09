/**
 * Stats Routes
 *
 * Endpoints for user statistics, streaks, and session tracking.
 *
 * Best Practices Implemented:
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
  language: z.string().optional(),
  project: z.string().optional(),
});

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

/** Registers stats routes on the Fastify instance. */
export function statsRoutes(app: FastifyInstance): void {
  const db = getDb();

  /**
   * GET /stats/me - Get current user's stats summary
   */
  app.get('/me', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const redis = getRedis();

    // Pipeline Redis reads for efficiency
    const pipeline = redis.pipeline();
    const today = getTodayDate();

    pipeline.hgetall(REDIS_KEYS.streakData(userId));
    pipeline.get(REDIS_KEYS.dailySession(userId, today));

    const results = await pipeline.exec();
    const streakData = results?.[0]?.[1] as Record<string, string> | null;
    const todaySessionStr = results?.[1]?.[1] as string | null;
    const todaySession = todaySessionStr ? parseInt(todaySessionStr, 10) : 0;

    // Build streak info
    const currentStreak = parseInt(streakData?.count ?? '0', 10);
    const longestStreak = parseInt(streakData?.longest ?? '0', 10);
    const lastActiveDate = streakData?.lastDate ?? null;
    const streakStatus = calculateStreakStatus(lastActiveDate);

    const streak: StreakInfo = {
      currentStreak,
      longestStreak,
      lastActiveDate,
      isActiveToday: streakStatus === 'active',
      streakStatus,
    };

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
  });

  /**
   * GET /stats/streak - Get detailed streak information
   */
  app.get('/streak', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const redis = getRedis();

    const streakData = await redis.hgetall(REDIS_KEYS.streakData(userId));

    const currentStreak = parseInt(streakData.count ?? '0', 10);
    const longestStreak = parseInt(streakData.longest ?? '0', 10);
    const lastActiveDate = streakData.lastDate ?? null;
    const streakStatus = calculateStreakStatus(lastActiveDate);

    const streak: StreakInfo = {
      currentStreak,
      longestStreak,
      lastActiveDate,
      isActiveToday: streakStatus === 'active',
      streakStatus,
    };

    return reply.send({ data: streak });
  });

  /**
   * POST /stats/session - Record coding session time
   * Called periodically by the extension with session duration increment
   */
  app.post('/session', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const result = SessionPayloadSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'INVALID_PAYLOAD', message: 'Invalid session data' },
      });
    }

    const { sessionDuration, language, project } = result.data;
    const today = getTodayDate();
    const redis = getRedis();

    // Get existing streak data to check if we need to update it
    const existingStreakData = await redis.hgetall(REDIS_KEYS.streakData(userId));
    const lastDate = existingStreakData.lastDate;

    // Pipeline for atomic operations
    const pipeline = redis.pipeline();

    // 1. Update daily session time (accumulate)
    const sessionKey = REDIS_KEYS.dailySession(userId, today);
    pipeline.incrby(sessionKey, sessionDuration);
    pipeline.expire(sessionKey, SESSION_TTL_SECONDS);

    // 2. Update streak if needed (only once per day)
    let newStreak = 1;
    let shouldCheckStreakAchievements = false;

    if (lastDate !== today) {
      // First activity of the day - update streak
      shouldCheckStreakAchievements = true;

      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const todayDateObj = new Date(today);
        const daysDiff = Math.floor(
          (todayDateObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day - increment streak
          newStreak = parseInt(existingStreakData.count ?? '0', 10) + 1;
        }
        // daysDiff > 1 means streak is broken, reset to 1
      }

      const longestStreak = Math.max(newStreak, parseInt(existingStreakData.longest ?? '0', 10));

      pipeline.hset(REDIS_KEYS.streakData(userId), {
        count: newStreak.toString(),
        lastDate: today,
        longest: longestStreak.toString(),
      });
      pipeline.expire(REDIS_KEYS.streakData(userId), STREAK_TTL_SECONDS * 2);
    }

    // 3. Update weekly leaderboard score
    pipeline.zincrby(REDIS_KEYS.weeklyLeaderboard('time'), sessionDuration, userId);

    // 4. Update network activity (1-minute bucket for heatmap)
    const minute = Math.floor(Date.now() / 60000);
    pipeline.hincrby(REDIS_KEYS.networkIntensity(minute), 'count', 1);
    pipeline.expire(REDIS_KEYS.networkIntensity(minute), NETWORK_ACTIVITY_TTL_SECONDS);

    // 5. Track language if provided
    if (language) {
      pipeline.hincrby(REDIS_KEYS.networkIntensity(minute), `lang:${language}`, 1);
    }

    await pipeline.exec();

    // Check for streak achievements (async, fire-and-forget)
    if (shouldCheckStreakAchievements) {
      void checkStreakAchievements(userId, newStreak);
    }

    logger.debug({ userId, sessionDuration, language, project }, 'Recorded session');

    return reply.send({ data: { recorded: true } });
  });

  /**
   * GET /stats/weekly - Get weekly statistics with real-time data
   */
  app.get('/weekly', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  /**
   * GET /stats/achievements - Get all user achievements
   */
  app.get('/achievements', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    const achievementRecords = await db.achievement.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    const achievements: AchievementDTO[] = achievementRecords.map((a) => ({
      id: a.id,
      type: a.type as AchievementDTO['type'],
      title: a.title,
      description: a.description,
      earnedAt: a.earnedAt.toISOString(),
    }));

    return reply.send({ data: achievements });
  });

  /**
   * Check and award streak achievements.
   */
  async function checkStreakAchievements(userId: string, streak: number): Promise<void> {
    const milestones = [
      { streak: 7, type: 'STREAK_7' as const },
      { streak: 30, type: 'STREAK_30' as const },
      { streak: 100, type: 'STREAK_100' as const },
    ];

    for (const milestone of milestones) {
      if (streak === milestone.streak) {
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
        break; // Only one achievement per streak update
      }
    }
  }
}
