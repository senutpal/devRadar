/**
 * User status indicating online presence.
 */
export type UserStatusType = 'online' | 'idle' | 'dnd' | 'offline';

/**
 * User subscription tier.
 */
export type TierType = 'HACKER' | 'PRO' | 'TEAM';

/**
 * Team member role.
 */
export type RoleType = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * WebSocket message types.
 */
export type MessageType =
  | 'STATUS_UPDATE'
  | 'FRIEND_STATUS'
  | 'POKE'
  | 'CONFLICT_ALERT'
  | 'ACHIEVEMENT'
  | 'ERROR'
  | 'HEARTBEAT';

/**
 * Unix timestamp in milliseconds (value returned by Date.now()).
 */
export type EpochMillis = number;

/**
 * Intensity value constrained to 0-100 range.
 * Represents coding intensity based on keystroke velocity.
 * @min 0
 * @max 100
 */
export type Intensity = number & { readonly __brand: 'Intensity' };

/**
 * Activity payload representing coding activity.
 */
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
  /**
   * Coding intensity (keystroke velocity).
   * @min 0
   * @max 100
   */
  intensity?: Intensity;
}

/**
 * User presence status.
 */
export interface UserStatus {
  userId: string;
  status: UserStatusType;
  activity?: ActivityPayload;
  /** Last update timestamp in milliseconds since Unix epoch (Date.now()) */
  updatedAt: EpochMillis;
}

/**
 * WebSocket message envelope.
 */
export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  /** Message timestamp in milliseconds since Unix epoch (Date.now()) */
  timestamp: EpochMillis;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

/**
 * User profile data transfer object.
 */
export interface UserDTO {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: TierType;
  privacyMode: boolean;
  createdAt: string;
}

/**
 * Poke request payload.
 */
export interface PokePayload {
  fromUserId: string;
  toUserId: string;
  message?: string;
}

/**
 * Conflict alert payload for merge conflict radar.
 */
export interface ConflictAlertPayload {
  fileHash: string;
  editors: string[];
  teamId: string;
}

/**
 * API error response.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
