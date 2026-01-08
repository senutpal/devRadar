/** User presence status: online, idle, do-not-disturb, or offline. */
export type UserStatusType = 'online' | 'idle' | 'dnd' | 'offline';

/** Subscription tier for feature gating. */
export type TierType = 'FREE' | 'PRO' | 'TEAM';

/** Team member permission level. */
export type RoleType = 'OWNER' | 'ADMIN' | 'MEMBER';

/** State of a friend request. */
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** All WebSocket message types used in client-server communication. */
export type MessageType =
  | 'AUTH'
  | 'AUTH_SUCCESS'
  | 'CONNECTED'
  | 'STATUS_UPDATE'
  | 'FRIEND_STATUS'
  | 'POKE'
  | 'CONFLICT_ALERT'
  | 'ACHIEVEMENT'
  | 'ERROR'
  | 'HEARTBEAT'
  | 'PONG'
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED';

/** Unix timestamp in milliseconds (from Date.now()). */
export type EpochMillis = number;

/**
 * Coding intensity score (0-100) based on keystroke velocity.
 * Uses branded type for type safety.
 */
export type Intensity = number & { readonly __brand: 'Intensity' };

/** Coding activity payload sent with status updates. */
export interface ActivityPayload {
  /** Current file name (can be masked for privacy) */
  fileName?: string;
  /** Programming language */
  language?: string;
  /** Project name (can be masked for privacy) */
  project?: string;
  /** Workspace name */
  workspace?: string;
  /** Session duration in seconds */
  sessionDuration: number;
  /** Coding intensity (0-100 based on keystroke velocity). */
  intensity?: Intensity;
}

/** User presence status with optional activity. */
export interface UserStatus {
  userId: string;
  status: UserStatusType;
  activity?: ActivityPayload;
  /** Last update timestamp in milliseconds since Unix epoch (Date.now()) */
  updatedAt: EpochMillis;
}

/** WebSocket message envelope with metadata. */
export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  /** Message timestamp in milliseconds since Unix epoch (Date.now()) */
  timestamp: EpochMillis;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

/** Full user profile (returned from /users/me). */
export interface UserDTO {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: TierType;
  privacyMode: boolean;
  /** Account creation timestamp as ISO 8601 / RFC3339 string (e.g., "2024-01-01T12:00:00Z") */
  createdAt: string;
}

/** Minimal user info for friend lists and search results. */
export interface PublicUserDTO {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Friend request with sender and receiver details. */
export interface FriendRequestDTO {
  id: string;
  fromUser: PublicUserDTO;
  toUser: PublicUserDTO;
  status: FriendRequestStatus;
  /** Request creation timestamp as ISO 8601 string */
  createdAt: string;
}

/** Payload for FRIEND_REQUEST_RECEIVED WebSocket message. */
export interface FriendRequestReceivedPayload {
  request: FriendRequestDTO;
}

/** Payload for FRIEND_REQUEST_ACCEPTED WebSocket message. */
export interface FriendRequestAcceptedPayload {
  requestId: string;
  friend: PublicUserDTO;
}

/** Poke action between friends. */
export interface PokePayload {
  fromUserId: string;
  toUserId: string;
  message?: string;
}

/** Alert when multiple users edit the same file. */
export interface ConflictAlertPayload {
  fileHash: string;
  /** Array of user IDs currently editing this file */
  editors: string[];
  teamId: string;
}

/** Standard API error response format. */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Wrapper for paginated list responses. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
