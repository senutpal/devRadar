/*** WebSocket Handler
 *
 * Handles WebSocket connections with:
 * - JWT authentication on connection
 * - Message validation with Zod
 * - Heartbeat processing
 * - Presence broadcasting
 */

import {
  UserStatusTypeSchema,
  ActivityPayloadSchema,
  PokePayloadSchema,
  REDIS_KEYS,
} from '@devradar/shared';
import { z } from 'zod';

import type {
  AuthenticatedWebSocket,
  WsMessage,
  PokePayload,
  FriendStatusPayload,
  ConnectedPayload,
  ErrorPayload,
} from '@/ws/types';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket as WsSocket } from 'ws';

import { logger, createChildLogger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { setPresence, getPresences, deletePresence, getRedisSubscriber } from '@/services/redis';
import { WsCloseCodes } from '@/ws/types';

/**
 * Inbound message schema ***/
const InboundMessageSchema = z.object({
  type: z.enum(['HEARTBEAT', 'POKE', 'SUBSCRIBE', 'UNSUBSCRIBE', 'STATUS_UPDATE']),
  payload: z.unknown(),
  timestamp: z.number().int().positive(),
  correlationId: z.string().uuid().optional(),
});

/*** Heartbeat message schema ***/
const HeartbeatMessageSchema = z.object({
  ping: z.boolean().optional(),
});

/*** Status update message schema ***/
const StatusUpdateMessageSchema = z.object({
  status: UserStatusTypeSchema,
  activity: ActivityPayloadSchema.optional(),
});

/*** Active WebSocket connections mapped by userId ***/
const connections = new Map<string, AuthenticatedWebSocket>();

/*** Channel subscription tracking: channel -> Set of userIds subscribed ***/
const channelSubscriptions = new Map<string, Set<string>>();

/*** Flag to track if global message handler is initialized ***/
let globalHandlerInitialized = false;

/*** Send a message to a WebSocket client ***/
function send(ws: WsSocket, type: string, payload: unknown, correlationId?: string): void {
  if (ws.readyState !== ws.OPEN) return;

  const message: WsMessage = {
    type: type as WsMessage['type'],
    payload,
    timestamp: Date.now(),
  };

  if (correlationId) {
    message.correlationId = correlationId;
  }

  ws.send(JSON.stringify(message));
}

/*** Send error to client ***/
function sendError(ws: WsSocket, code: string, message: string, correlationId?: string): void {
  const payload: ErrorPayload = { code, message };
  send(ws, 'ERROR', payload, correlationId);
}

/*** Follow type for database query ***/
interface FollowResult {
  followingId: string;
}

/*** Get user's friend IDs (users they are following) ***/
async function getUserFriendIds(userId: string): Promise<string[]> {
  const db = getDb();
  const follows = (await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })) as FollowResult[];
  return follows.map((f: FollowResult) => f.followingId);
}

/*** Initialize global Redis message handler (called once) ***/
function initializeGlobalMessageHandler(): void {
  if (globalHandlerInitialized) return;

  const subscriber = getRedisSubscriber();

  subscriber.on('message', (channel: string, messageData: string) => {
    try {
      const data = JSON.parse(messageData) as FriendStatusPayload;
      const subscribedUserIds = channelSubscriptions.get(channel);

      if (!subscribedUserIds) return;
      /* Route message to all subscribed connections */
      for (const userId of subscribedUserIds) {
        const ws = connections.get(userId);
        if (ws && ws.readyState === ws.OPEN) {
          send(ws, 'FRIEND_STATUS', data);
        }
      }
    } catch (error) {
      logger.error({ error, channel }, 'Failed to parse presence message');
    }
  });

  globalHandlerInitialized = true;
  logger.debug('Global Redis message handler initialized');
}

/*** Subscribe to friend presence updates via Redis pub/sub ***/
async function subscribeToFriends(ws: AuthenticatedWebSocket): Promise<void> {
  const subscriber = getRedisSubscriber();
  /* Ensure global handler is set up */
  initializeGlobalMessageHandler();
  /* Subscribe to friend channels */
  for (const friendId of ws.friendIds) {
    const channel = REDIS_KEYS.presenceChannel(friendId);
    /* Track subscription */
    let subscribers = channelSubscriptions.get(channel);
    if (!subscribers) {
      subscribers = new Set();
      channelSubscriptions.set(channel, subscribers);
      /* First subscriber - actually subscribe to Redis */
      await subscriber.subscribe(channel);
      logger.debug({ channel }, 'Subscribed to Redis channel');
    }
    subscribers.add(ws.userId);
  }

  logger.debug(
    { userId: ws.userId, friendCount: ws.friendIds.length },
    'User subscribed to friend presence'
  );
}

/*** Unsubscribe from friend presence channels ***/
async function unsubscribeFromFriends(ws: AuthenticatedWebSocket): Promise<void> {
  const subscriber = getRedisSubscriber();

  for (const friendId of ws.friendIds) {
    const channel = REDIS_KEYS.presenceChannel(friendId);
    const subscribers = channelSubscriptions.get(channel);

    if (subscribers) {
      subscribers.delete(ws.userId);
      /* Last subscriber - unsubscribe from Redis */
      if (subscribers.size === 0) {
        channelSubscriptions.delete(channel);
        await subscriber.unsubscribe(channel);
        logger.debug({ channel }, 'Unsubscribed from Redis channel');
      }
    }
  }
}

/*** Handle heartbeat message ***/
function handleHeartbeat(
  ws: AuthenticatedWebSocket,
  payload: unknown,
  correlationId?: string
): void {
  const result = HeartbeatMessageSchema.safeParse(payload);

  if (!result.success) {
    sendError(ws, 'INVALID_PAYLOAD', 'Invalid heartbeat payload', correlationId);
    return;
  }

  ws.lastHeartbeat = Date.now();
  /* Send pong */
  send(ws, 'PONG', { timestamp: Date.now() }, correlationId);
}

/*** Handle status update message ***/
async function handleStatusUpdate(
  ws: AuthenticatedWebSocket,
  payload: unknown,
  correlationId?: string
): Promise<void> {
  const result = StatusUpdateMessageSchema.safeParse(payload);

  if (!result.success) {
    sendError(ws, 'INVALID_PAYLOAD', 'Invalid status update payload', correlationId);
    return;
  }

  const { status, activity } = result.data;
  /* Update presence in Redis */
  await setPresence(ws.userId, {
    userId: ws.userId,
    status: status as string,
    activity: activity as Record<string, unknown> | undefined,
    updatedAt: Date.now(),
  });
}

/*** Handle poke message ***/
function handlePoke(ws: AuthenticatedWebSocket, payload: unknown, correlationId?: string): void {
  const result = PokePayloadSchema.safeParse({
    ...(payload as Record<string, unknown>),
    fromUserId: ws.userId,
  });

  if (!result.success) {
    sendError(ws, 'INVALID_PAYLOAD', 'Invalid poke payload', correlationId);
    return;
  }

  const { toUserId, message } = result.data;
  /* Check if target user is a friend */
  if (!ws.friendIds.includes(toUserId)) {
    sendError(ws, 'NOT_FRIEND', 'You can only poke friends', correlationId);
    return;
  }
  /* Get target connection */
  const targetWs = connections.get(toUserId);

  if (targetWs && targetWs.readyState === targetWs.OPEN) {
    const pokePayload: PokePayload = {
      toUserId,
      fromUserId: ws.userId,
    };
    if (message) {
      pokePayload.message = message;
    }
    send(targetWs, 'POKE', pokePayload);
  } else {
    /* User is offline - could queue for later or just acknowledge */
    logger.debug({ from: ws.userId, to: toUserId }, 'Poke target offline');
  }
}

/*** Handle incoming WebSocket message ***/
async function handleMessage(ws: AuthenticatedWebSocket, data: string): Promise<void> {
  const log = createChildLogger({ userId: ws.userId });

  try {
    const parsed: unknown = JSON.parse(data);
    const result = InboundMessageSchema.safeParse(parsed);

    if (!result.success) {
      sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
      return;
    }

    const { type, payload, correlationId } = result.data;

    log.debug({ type }, 'Received WebSocket message');

    switch (type) {
      case 'HEARTBEAT':
        handleHeartbeat(ws, payload, correlationId);
        break;

      case 'STATUS_UPDATE':
        await handleStatusUpdate(ws, payload, correlationId);
        break;

      case 'POKE':
        handlePoke(ws, payload, correlationId);
        break;

      case 'SUBSCRIBE':
      case 'UNSUBSCRIBE':
        /* These message types are handled at connection level, not per-message */
        sendError(
          ws,
          'NOT_IMPLEMENTED',
          'Dynamic subscription changes are not yet supported',
          correlationId
        );
        break;

      default:
        sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${String(type)}`, correlationId);
    }
  } catch (error) {
    log.error({ error }, 'Error handling WebSocket message');
    sendError(ws, 'INTERNAL_ERROR', 'Failed to process message');
  }
}

/*** Handle connection close ***/
async function handleClose(ws: AuthenticatedWebSocket, code: number): Promise<void> {
  const log = createChildLogger({ userId: ws.userId });

  log.info({ code }, 'WebSocket connection closed');
  /* Remove from connections */
  connections.delete(ws.userId);
  /* Set user offline after grace period (60 seconds) */
  /* This allows for quick reconnections without appearing offline */
  const userId = ws.userId;
  setTimeout(() => {
    const currentConnection = connections.get(userId);
    if (!currentConnection) {
      void deletePresence(userId).then(() => {
        log.debug('User set to offline after grace period');
      });
    }
  }, 60_000);
  /* Unsubscribe from friend channels using the global subscription tracker */
  await unsubscribeFromFriends(ws);
}

/*** Register WebSocket handler with Fastify ***/
export function registerWebSocketHandler(app: FastifyInstance): void {
  app.get(
    '/ws',
    {
      websocket: true,
      config: {
        rateLimit: {
          max: 50,
          timeWindow: '1 minute',
        },
      },
    },
    async (socket: WsSocket, request: FastifyRequest) => {
      const ws = socket as AuthenticatedWebSocket;

      try {
        /* Extract token from query string */
        const token = (request.query as Record<string, string>).token;

        if (!token) {
          ws.close(WsCloseCodes.UNAUTHORIZED, 'Token required');
          return;
        }
        /* Verify JWT from query parameter */
        /* (WebSocket connections from browsers can't set Authorization headers) */
        let decoded: { userId: string };
        try {
          decoded = app.jwt.verify<{ userId: string }>(token);
        } catch {
          ws.close(WsCloseCodes.INVALID_TOKEN, 'Invalid token');
          return;
        }

        const { userId } = decoded;
        /* Set up authenticated connection */
        ws.userId = userId;
        ws.isAuthenticated = true;
        ws.connectedAt = Date.now();
        ws.lastHeartbeat = Date.now();
        /* Get user's friends */
        ws.friendIds = await getUserFriendIds(userId);
        /* Store connection */
        const existingConnection = connections.get(userId);
        if (existingConnection) {
          existingConnection.close(WsCloseCodes.GOING_AWAY, 'New connection established');
        }
        connections.set(userId, ws);
        /* Subscribe to friend presence updates */
        await subscribeToFriends(ws);
        /* Get initial friend presences */
        const friendPresences = await getPresences(ws.friendIds);
        /* Send connected message with initial friend statuses */
        const connectedPayload: ConnectedPayload = {
          userId,
          friendCount: ws.friendIds.length,
        };
        send(ws, 'CONNECTED', connectedPayload);
        /* Send initial friend statuses */
        const presenceEntries = Array.from(friendPresences.entries());
        for (const [friendId, presence] of presenceEntries) {
          const payload: FriendStatusPayload = {
            userId: friendId,
            status: presence.status as FriendStatusPayload['status'],
            updatedAt: presence.updatedAt,
          };
          if (presence.activity) {
            payload.activity = presence.activity as unknown as FriendStatusPayload['activity'];
          }
          send(ws, 'FRIEND_STATUS', payload);
        }

        logger.info(
          { userId, friendCount: ws.friendIds.length },
          'WebSocket connection established'
        );
        /* Handle messages */
        ws.on('message', (data: Buffer) => {
          void handleMessage(ws, data.toString());
        });
        /* Handle close */
        ws.on('close', (closeCode: number) => {
          void handleClose(ws, closeCode);
        });
        /* Handle errors */
        ws.on('error', (error: Error) => {
          logger.error({ error, userId }, 'WebSocket error');
        });
      } catch (error) {
        logger.error({ error }, 'WebSocket connection error');
        ws.close(WsCloseCodes.SERVER_ERROR, 'Internal server error');
      }
    }
  );

  logger.info('WebSocket handler registered at /ws');
}

/*** Broadcast a message to specific users ***/
export function broadcastToUsers(userIds: string[], type: string, payload: unknown): void {
  for (const userId of userIds) {
    const ws = connections.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      send(ws, type, payload);
    }
  }
}

/*** Get count of active connections ***/
export function getConnectionCount(): number {
  return connections.size;
}
