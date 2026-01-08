/*** Friend Request Routes
 *
 * Manages friend requests between users:
 * - POST /friend-requests - Send a friend request
 * - GET /friend-requests/incoming - List pending incoming requests
 * - GET /friend-requests/outgoing - List pending outgoing requests
 * - POST /friend-requests/:id/accept - Accept a friend request
 * - POST /friend-requests/:id/reject - Reject a friend request
 * - DELETE /friend-requests/:id - Cancel an outgoing request
 */

import { PaginationQuerySchema, SendFriendRequestSchema } from '@devradar/shared';
import { z } from 'zod';

import type { PublicUserDTO, FriendRequestDTO } from '@devradar/shared';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { broadcastToUsers } from '@/ws/handler';

const RequestIdParamsSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
});

interface FriendRequestWithUsers {
  id: string;
  fromId: string;
  toId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  from: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  to: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

function toPublicUserDTO(user: {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}): PublicUserDTO {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

function toFriendRequestDTO(request: FriendRequestWithUsers): FriendRequestDTO {
  return {
    id: request.id,
    fromUser: toPublicUserDTO(request.from),
    toUser: toPublicUserDTO(request.to),
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  };
}

/** Registers all friend request routes on the Fastify instance. */
export function friendRequestRoutes(app: FastifyInstance): void {
  const db = getDb();

  // POST / - Send friend request
  app.post(
    '/',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const bodyResult = SendFriendRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: bodyResult.error.issues },
        });
      }

      const { toUserId } = bodyResult.data;

      /* Prevent self-request */
      if (userId === toUserId) {
        throw new ConflictError('You cannot send a friend request to yourself');
      }

      /* Check if target user exists */
      const targetUser = await db.user.findUnique({
        where: { id: toUserId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (!targetUser) {
        throw new NotFoundError('User', toUserId);
      }

      /* Check if already friends (bidirectional follow - BOTH directions must exist) */
      const mutualFollows = await db.follow.findMany({
        where: {
          OR: [
            { followerId: userId, followingId: toUserId },
            { followerId: toUserId, followingId: userId },
          ],
        },
      });

      if (mutualFollows.length === 2) {
        throw new ConflictError('You are already friends with this user');
      }

      /* Check for existing pending request in either direction */
      const existingRequest = await db.friendRequest.findFirst({
        where: {
          OR: [
            { fromId: userId, toId: toUserId, status: 'PENDING' },
            { fromId: toUserId, toId: userId, status: 'PENDING' },
          ],
        },
        include: {
          from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      if (existingRequest) {
        if (existingRequest.fromId === userId) {
          throw new ConflictError('You already have a pending request to this user');
        } else {
          /* They sent us a request - auto-accept it! */
          return await acceptRequestInternal(
            db,
            existingRequest as FriendRequestWithUsers,
            userId,
            reply
          );
        }
      }

      /* Delete any previously REJECTED requests to allow resending */
      await db.friendRequest.deleteMany({
        where: {
          fromId: userId,
          toId: toUserId,
          status: 'REJECTED',
        },
      });

      /* Get current user info for the response */
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (!currentUser) {
        throw new NotFoundError('User', userId);
      }

      /* Create the friend request */
      const friendRequest = await db.friendRequest.create({
        data: {
          fromId: userId,
          toId: toUserId,
        },
        include: {
          from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      const requestDTO = toFriendRequestDTO(friendRequest as FriendRequestWithUsers);

      logger.info(
        { fromId: userId, toId: toUserId, requestId: friendRequest.id },
        'Friend request sent'
      );

      /* Broadcast to target user via WebSocket */
      broadcastToUsers([toUserId], 'FRIEND_REQUEST_RECEIVED', { request: requestDTO });

      return reply.status(201).send({
        data: requestDTO,
      });
    }
  );

  // GET /incoming - List pending incoming requests
  app.get(
    '/incoming',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paginationResult = PaginationQuerySchema.safeParse(request.query);
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 20 };

      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        db.friendRequest.findMany({
          where: { toId: userId, status: 'PENDING' },
          include: {
            from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.friendRequest.count({ where: { toId: userId, status: 'PENDING' } }),
      ]);

      return reply.send({
        data: (requests as FriendRequestWithUsers[]).map(toFriendRequestDTO),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + requests.length < total,
        },
      });
    }
  );

  // GET /outgoing - List pending outgoing requests
  app.get(
    '/outgoing',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paginationResult = PaginationQuerySchema.safeParse(request.query);
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 20 };

      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        db.friendRequest.findMany({
          where: { fromId: userId, status: 'PENDING' },
          include: {
            from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.friendRequest.count({ where: { fromId: userId, status: 'PENDING' } }),
      ]);

      return reply.send({
        data: (requests as FriendRequestWithUsers[]).map(toFriendRequestDTO),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + requests.length < total,
        },
      });
    }
  );

  // POST /:id/accept - Accept a friend request
  app.post(
    '/:id/accept',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = RequestIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid request ID');
      }

      const { id: requestId } = paramsResult.data;

      /* Find the request */
      const friendRequest = await db.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      if (!friendRequest) {
        throw new NotFoundError('Friend request', requestId);
      }

      /* Only the recipient can accept */
      if (friendRequest.toId !== userId) {
        throw new AuthorizationError('You can only accept requests sent to you');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new ConflictError(`Request has already been ${friendRequest.status.toLowerCase()}`);
      }

      return await acceptRequestInternal(
        db,
        friendRequest as FriendRequestWithUsers,
        userId,
        reply
      );
    }
  );

  // POST /:id/reject - Reject a friend request
  app.post(
    '/:id/reject',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = RequestIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid request ID');
      }

      const { id: requestId } = paramsResult.data;

      /* Find the request */
      const friendRequest = await db.friendRequest.findUnique({
        where: { id: requestId },
      });

      if (!friendRequest) {
        throw new NotFoundError('Friend request', requestId);
      }

      /* Only the recipient can reject */
      if (friendRequest.toId !== userId) {
        throw new AuthorizationError('You can only reject requests sent to you');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new ConflictError(`Request has already been ${friendRequest.status.toLowerCase()}`);
      }

      /* Update status to rejected */
      await db.friendRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      logger.info({ requestId, userId }, 'Friend request rejected');

      return reply.status(200).send({
        data: { message: 'Friend request rejected' },
      });
    }
  );

  // DELETE /:id - Cancel outgoing request
  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = RequestIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid request ID');
      }

      const { id: requestId } = paramsResult.data;

      /* Find the request */
      const friendRequest = await db.friendRequest.findUnique({
        where: { id: requestId },
      });

      if (!friendRequest) {
        throw new NotFoundError('Friend request', requestId);
      }

      /* Only the sender can cancel */
      if (friendRequest.fromId !== userId) {
        throw new AuthorizationError('You can only cancel requests you sent');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new ConflictError(`Request has already been ${friendRequest.status.toLowerCase()}`);
      }

      /* Delete the request */
      await db.friendRequest.delete({
        where: { id: requestId },
      });

      logger.info({ requestId, userId }, 'Friend request cancelled');

      return reply.status(204).send();
    }
  );

  // GET /count - Pending incoming count (for badge)
  app.get(
    '/count',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const count = await db.friendRequest.count({
        where: { toId: userId, status: 'PENDING' },
      });

      return reply.send({
        data: { count },
      });
    }
  );
}

/** Internal helper to accept a request and create follow relationships. */
async function acceptRequestInternal(
  db: ReturnType<typeof getDb>,
  friendRequest: FriendRequestWithUsers,
  userId: string,
  reply: FastifyReply
): Promise<FastifyReply> {
  /* Use a transaction to ensure atomicity */
  await db.$transaction(async (tx) => {
    /* Update request status */
    await tx.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: 'ACCEPTED' },
    });

    /* Create bidirectional follow entries */
    await tx.follow.createMany({
      data: [
        { followerId: friendRequest.fromId, followingId: friendRequest.toId },
        { followerId: friendRequest.toId, followingId: friendRequest.fromId },
      ],
      skipDuplicates: true,
    });
  });

  logger.info({ requestId: friendRequest.id, userId }, 'Friend request accepted');

  /* Broadcast to both users */
  broadcastToUsers([friendRequest.fromId], 'FRIEND_REQUEST_ACCEPTED', {
    requestId: friendRequest.id,
    friend: toPublicUserDTO(friendRequest.to),
  });

  broadcastToUsers([friendRequest.toId], 'FRIEND_REQUEST_ACCEPTED', {
    requestId: friendRequest.id,
    friend: toPublicUserDTO(friendRequest.from),
  });

  return reply.status(200).send({
    data: {
      message: 'Friend request accepted',
      friend: toPublicUserDTO(friendRequest.from),
    },
  });
}
