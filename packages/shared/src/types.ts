/*** User status indicating online presence ***/
export type UserStatusType = 'online' | 'idle' | 'dnd' | 'offline';

/*** User subscription tier ***/
export type TierType = 'FREE' | 'PRO' | 'TEAM';

/*** Team member role ***/
export type RoleType = 'OWNER' | 'ADMIN' | 'MEMBER';

/*** Friend request status ***/
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/*** WebSocket message types ***/
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

/*** Unix timestamp in milliseconds (value returned by Date.now()) ***/
export type EpochMillis = number;

/*** Intensity value constrained to 0-100 range.
 * Represents coding intensity based on keystroke velocity.
 * @min 0
 * @max 100
 */
export type Intensity = number & { readonly __brand: 'Intensity' };

/**
 * Activity payload representing coding activity ***/
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
  /*** Coding intensity (keystroke velocity).
   * @min 0
   * @max 100
   */
  intensity?: Intensity;
}

/**
 * User presence status ***/
export interface UserStatus {
  userId: string;
  status: UserStatusType;
  activity?: ActivityPayload;
  /** Last update timestamp in milliseconds since Unix epoch (Date.now()) */
  updatedAt: EpochMillis;
}

/*** WebSocket message envelope ***/
export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  /** Message timestamp in milliseconds since Unix epoch (Date.now()) */
  timestamp: EpochMillis;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

/*** User profile data transfer object ***/
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

/*** Minimal public user info for friend requests and search results ***/
export interface PublicUserDTO {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/*** Friend request data transfer object ***/
export interface FriendRequestDTO {
  id: string;
  fromUser: PublicUserDTO;
  toUser: PublicUserDTO;
  status: FriendRequestStatus;
  /** Request creation timestamp as ISO 8601 string */
  createdAt: string;
}

/*** WebSocket payload: Friend request received ***/
export interface FriendRequestReceivedPayload {
  request: FriendRequestDTO;
}

/*** WebSocket payload: Friend request accepted ***/
export interface FriendRequestAcceptedPayload {
  requestId: string;
  friend: PublicUserDTO;
}

/*** Poke request payload ***/
export interface PokePayload {
  fromUserId: string;
  toUserId: string;
  message?: string;
}

/*** Conflict alert payload for merge conflict radar ***/
export interface ConflictAlertPayload {
  fileHash: string;
  /** Array of user IDs currently editing this file */
  editors: string[];
  teamId: string;
}

/*** API error response ***/
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/*** Paginated response wrapper ***/
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
