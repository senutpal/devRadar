/**
 * WebSocket Types
 *
 * Type definitions for WebSocket communication.
 */

import type { UserStatusType, ActivityPayload as SharedActivityPayload } from '@devradar/shared';
import type { WebSocket } from 'ws';

/**
 * Extended WebSocket with user context.
 */
export interface AuthenticatedWebSocket extends WebSocket {
  /** User ID from JWT */
  userId: string;

  /** User's friends (following) for presence subscriptions */
  friendIds: string[];

  /** Whether the connection is authenticated */
  isAuthenticated: boolean;

  /** Last heartbeat timestamp */
  lastHeartbeat: number;

  /** Connection established timestamp */
  connectedAt: number;
}

/**
 * Inbound WebSocket message types.
 */
export type InboundMessageType = 'HEARTBEAT' | 'POKE' | 'SUBSCRIBE' | 'UNSUBSCRIBE';

/**
 * Outbound WebSocket message types.
 */
export type OutboundMessageType =
  | 'STATUS_UPDATE'
  | 'FRIEND_STATUS'
  | 'POKE'
  | 'ERROR'
  | 'CONNECTED'
  | 'PONG';

/**
 * Base WebSocket message structure.
 */
export interface WsMessage<T = unknown> {
  type: InboundMessageType | OutboundMessageType;
  payload: T;
  timestamp: number;
  correlationId?: string | undefined;
}

/**
 * Heartbeat payload (inbound).
 */
export interface HeartbeatPayload {
  status: UserStatusType;
  activity?: SharedActivityPayload | undefined;
}

/**
 * Poke payload (inbound/outbound).
 */
export interface PokePayload {
  toUserId: string;
  fromUserId?: string | undefined;
  message?: string | undefined;
}

/**
 * Friend status update payload (outbound).
 */
export interface FriendStatusPayload {
  userId: string;
  status: UserStatusType;
  activity?: SharedActivityPayload | undefined;
  updatedAt: number;
}

/**
 * Connected payload (outbound).
 */
export interface ConnectedPayload {
  userId: string;
  friendCount: number;
}

/**
 * Error payload (outbound).
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown> | undefined;
}

/**
 * WebSocket close codes.
 */
export const WsCloseCodes = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  INVALID_DATA: 1003,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  SERVER_ERROR: 1011,

  // Custom codes (4000-4999)
  UNAUTHORIZED: 4001,
  INVALID_TOKEN: 4002,
  TOKEN_EXPIRED: 4003,
  RATE_LIMITED: 4029,
} as const;

/**
 * WebSocket close reasons.
 */
export const WsCloseReasons: Record<number, string> = {
  [WsCloseCodes.NORMAL]: 'Normal closure',
  [WsCloseCodes.GOING_AWAY]: 'Going away',
  [WsCloseCodes.PROTOCOL_ERROR]: 'Protocol error',
  [WsCloseCodes.INVALID_DATA]: 'Invalid data',
  [WsCloseCodes.POLICY_VIOLATION]: 'Policy violation',
  [WsCloseCodes.MESSAGE_TOO_BIG]: 'Message too big',
  [WsCloseCodes.SERVER_ERROR]: 'Server error',
  [WsCloseCodes.UNAUTHORIZED]: 'Unauthorized',
  [WsCloseCodes.INVALID_TOKEN]: 'Invalid token',
  [WsCloseCodes.TOKEN_EXPIRED]: 'Token expired',
  [WsCloseCodes.RATE_LIMITED]: 'Rate limited',
};
