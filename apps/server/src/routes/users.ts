/**
 * User Routes
 *
 * User profile management endpoints.
 */

import { UserUpdateSchema } from '@devradar/shared';
import { z } from 'zod';

import type { UserDTO } from '@devradar/shared';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { NotFoundError, ValidationError } from '@/lib/errors';
import { getDb } from '@/services/db';
import { getPresence } from '@/services/redis';

/**
 * User ID params schema ***/
const UserIdParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

const SearchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
});

const VALID_TIERS = ['FREE', 'PRO', 'TEAM'] as const;
type ValidTier = (typeof VALID_TIERS)[number];

function toUserDTO(user: {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: string;
  privacyMode: boolean;
  createdAt: Date;
}): UserDTO {
  /* Runtime validation of tier value */
  const tier = VALID_TIERS.includes(user.tier as ValidTier)
    ? (user.tier as UserDTO['tier'])
    : 'FREE'; // Safe default for invalid DB values

  return {
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    tier,
    privacyMode: user.privacyMode,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Registers user routes on the Fastify instance. */
export function userRoutes(app: FastifyInstance): void {
  const db = getDb();

  // GET /me - Current user profile
  app.get(
    '/me',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }
      /* Get current presence */
      const presence = await getPresence(userId);

      return reply.send({
        data: {
          ...toUserDTO(user),
          status: presence?.status ?? 'offline',
          activity: presence?.activity,
        },
      });
    }
  );

  // GET /search - Search users by username
  // GET /:id - User by ID
  app.get(
    '/search',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryResult = SearchQuerySchema.safeParse(request.query);

      if (!queryResult.success) {
        throw new ValidationError('Search query must be at least 2 characters');
      }

      const { q: query } = queryResult.data;

      const users = await db.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
        take: 20,
      });

      return reply.send({
        data: users,
      });
    }
  );

  app.get(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = UserIdParamsSchema.safeParse(request.params);

      if (!result.success) {
        throw new ValidationError('Invalid user ID');
      }

      const { id } = result.data;

      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          githubId: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          privacyMode: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User', id);
      }
      /* Respect privacy mode */
      if (user.privacyMode) {
        return reply.send({
          data: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            privacyMode: true,
            status: 'incognito',
          },
        });
      }
      /* Get presence if not in privacy mode */
      const presence = await getPresence(id);

      return reply.send({
        data: {
          ...toUserDTO(user),
          followerCount: user._count.followers,
          followingCount: user._count.following,
          status: presence?.status ?? 'offline',
          activity: presence?.activity,
        },
      });
    }
  );

  // PATCH /me - Update current user
  app.patch(
    '/me',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const result = UserUpdateSchema.safeParse(request.body);

      if (!result.success) {
        throw new ValidationError('Invalid update data', {
          details: { errors: result.error.issues },
        });
      }

      const updateData = result.data;
      /* Build update object explicitly to handle exactOptionalPropertyTypes */
      const prismaUpdateData: { displayName?: string | null; privacyMode?: boolean } = {};
      if (updateData.displayName !== undefined) {
        prismaUpdateData.displayName = updateData.displayName;
      }
      if (updateData.privacyMode !== undefined) {
        prismaUpdateData.privacyMode = updateData.privacyMode;
      }

      const user = await db.user.update({
        where: { id: userId },
        data: prismaUpdateData,
      });

      return reply.send({
        data: toUserDTO(user),
      });
    }
  );
}
