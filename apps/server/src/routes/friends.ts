/*** Friends Routes
 *
 * Follow/unfollow functionality:
 * - GET /friends - List friends (following)
 * - POST /friends/:id - Follow a user
 * - DELETE /friends/:id - Unfollow a user
 * - GET /friends/followers - List followers
 */

import { PaginationQuerySchema } from '@devradar/shared';
import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { getPresences } from '@/services/redis';

/**
 * User ID params schema ***/
const UserIdParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

/*** Follow with user details type ***/
interface FollowWithUser {
  following: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    tier: string;
    privacyMode: boolean;
  };
  createdAt: Date;
}

/*** Follow with follower details type ***/
interface FollowWithFollower {
  follower: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    tier: string;
  };
  createdAt: Date;
}

/*** Register friend routes ***/
export function friendRoutes(app: FastifyInstance): void {
  const db = getDb();

  /*** GET /friends
   * List users the current user is following (friends) ***/
  app.get(
    '/',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paginationResult = PaginationQuerySchema.safeParse(request.query);
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 20 };

      const skip = (page - 1) * limit;
      /* Get following with user details */
      const [follows, total] = await Promise.all([
        db.follow.findMany({
          where: { followerId: userId },
          include: {
            following: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                tier: true,
                privacyMode: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }) as Promise<FollowWithUser[]>,
        db.follow.count({ where: { followerId: userId } }),
      ]);
      /* Get presences for friends */
      const friendIds = follows.map((f: FollowWithUser) => f.following.id);
      const presences = await getPresences(friendIds);
      /* Combine user data with presence */
      const friends = follows.map((f: FollowWithUser) => {
        const user = f.following;
        const presence = presences.get(user.id);

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          tier: user.tier,
          privacyMode: user.privacyMode,
          status: user.privacyMode ? 'incognito' : (presence?.status ?? 'offline'),
          activity: user.privacyMode ? undefined : presence?.activity,
          followedAt: f.createdAt.toISOString(),
        };
      });

      return reply.send({
        data: friends,
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + friends.length < total,
        },
      });
    }
  );

  /*** GET /friends/followers
   * List users following the current user ***/
  app.get(
    '/followers',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paginationResult = PaginationQuerySchema.safeParse(request.query);
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 20 };

      const skip = (page - 1) * limit;

      const [follows, total] = await Promise.all([
        db.follow.findMany({
          where: { followingId: userId },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                tier: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }) as Promise<FollowWithFollower[]>,
        db.follow.count({ where: { followingId: userId } }),
      ]);

      const followers = follows.map((f: FollowWithFollower) => ({
        ...f.follower,
        followedAt: f.createdAt.toISOString(),
      }));

      return reply.send({
        data: followers,
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + followers.length < total,
        },
      });
    }
  );

  /*** POST /friends/:id
   * Follow a user ***/
  app.post(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = UserIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid user ID');
      }

      const { id: targetUserId } = paramsResult.data;
      /* Prevent self-follow */
      if (userId === targetUserId) {
        throw new ConflictError('You cannot follow yourself');
      }
      /* Check if target user exists */
      const targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true },
      });

      if (!targetUser) {
        throw new NotFoundError('User', targetUserId);
      }
      /* Check if already following */
      const existingFollow = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });

      if (existingFollow) {
        throw new ConflictError(`You are already following ${targetUser.username}`);
      }
      /* Create follow */
      const follow = await db.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });

      logger.info({ userId, targetUserId }, 'User followed');

      return reply.status(201).send({
        data: {
          followerId: userId,
          followingId: targetUserId,
          username: targetUser.username,
          createdAt: follow.createdAt.toISOString(),
        },
      });
    }
  );

  /*** DELETE /friends/:id
   * Unfriend a user (removes bidirectional follow relationship) ***/
  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = UserIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid user ID');
      }

      const { id: targetUserId } = paramsResult.data;

      /* Check if friendship exists (at least one direction) */
      const existingFollow = await db.follow.findFirst({
        where: {
          OR: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId },
          ],
        },
      });

      if (!existingFollow) {
        throw new NotFoundError('Friendship');
      }

      /* Delete both directions (unfriend is bidirectional) */
      await db.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId },
          ],
        },
      });

      logger.info({ userId, targetUserId }, 'Users unfriended (bidirectional)');

      return reply.status(204).send();
    }
  );

  /*** GET /friends/:id/mutual
   * Get mutual friends with a user ***/
  app.get(
    '/:id/mutual',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = UserIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid user ID');
      }

      const { id: targetUserId } = paramsResult.data;
      /* Single efficient query: find users followed by BOTH userId AND targetUserId */
      const mutualFriends = await db.user.findMany({
        where: {
          AND: [
            { followers: { some: { followerId: userId } } },
            { followers: { some: { followerId: targetUserId } } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      return reply.send({
        data: mutualFriends,
      });
    }
  );
}
