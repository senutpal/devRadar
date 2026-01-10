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
  /** SHA256 hash of project_root + relative_path (first 16 chars) for conflict detection */
  fileHash?: string;
  /** Team ID for conflict radar (required for TEAM tier users) */
  teamId?: string;
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

// ============================================================================
// Phase 2: Gamification Types
// ============================================================================

/** Achievement types for gamification. */
export type AchievementType =
  | 'ISSUE_CLOSED'
  | 'PR_MERGED'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'STREAK_100'
  | 'FIRST_HOUR'
  | 'NIGHT_OWL'
  | 'EARLY_BIRD';

/** Achievement earned by user. */
export interface AchievementDTO {
  id: string;
  type: AchievementType;
  title: string;
  description: string | null;
  /** When the achievement was earned (ISO 8601) */
  earnedAt: string;
}

/** Streak status for UI display. */
export type StreakStatus = 'active' | 'at_risk' | 'broken';

/** User streak information. */
export interface StreakInfo {
  /** Current consecutive days streak */
  currentStreak: number;
  /** All-time longest streak */
  longestStreak: number;
  /** Last activity date (YYYY-MM-DD format) */
  lastActiveDate: string | null;
  /** Whether user has coded today */
  isActiveToday: boolean;
  /** Current streak health status */
  streakStatus: StreakStatus;
}

/** Weekly statistics for a user. */
export interface WeeklyStatsDTO {
  /** Start of the week (Monday 00:00 UTC, ISO 8601) */
  weekStart: string;
  /** Total coding time in seconds */
  totalSeconds: number;
  /** Number of coding sessions */
  totalSessions: number;
  /** Number of commits (from GitHub webhook) */
  totalCommits: number;
  /** Most used programming language */
  topLanguage: string | null;
  /** Most worked-on project */
  topProject: string | null;
  /** User's rank in weekly leaderboard (1-indexed, undefined if not ranked) */
  rank?: number | undefined;
}

/** Leaderboard entry for display. */
export interface LeaderboardEntry {
  /** Position in leaderboard (1-indexed) */
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Score (total seconds for time, count for commits) */
  score: number;
  /** Whether this user is a friend of the viewer */
  isFriend: boolean;
}

/** Network activity heatmap data. */
export interface NetworkActivity {
  /** Number of users active in last 5 minutes */
  totalActiveUsers: number;
  /** Average coding intensity (0-100) */
  averageIntensity: number;
  /** True if network is particularly active ("🔥 mode") */
  isHot: boolean;
  /** Human-readable activity message */
  message: string;
}

/** Payload for ACHIEVEMENT WebSocket message. */
export interface AchievementPayload {
  achievement: AchievementDTO;
  /** User who earned the achievement */
  userId: string;
  /** Username for display */
  username: string;
}

/** User stats summary (returned from /stats/me). */
export interface UserStatsDTO {
  streak: StreakInfo;
  /** Today's coding time in seconds */
  todaySession: number;
  /** Current week's stats (may be null if no activity) */
  weeklyStats: WeeklyStatsDTO | null;
  /** Recent achievements (latest 5) */
  recentAchievements: AchievementDTO[];
}
