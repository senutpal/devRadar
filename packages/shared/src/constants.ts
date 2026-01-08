/** Presence TTL in seconds. Set to 2x heartbeat interval to tolerate missed beats. */
export const PRESENCE_TTL_SECONDS = 60;

/** Heartbeat interval (30 seconds). */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Idle threshold (5 minutes of no activity). */
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

/** WebSocket reconnection with exponential backoff. */
export const WS_RECONNECT_CONFIG = {
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  multiplier: 2,
  maxAttempts: 10,
} as const;

/** Redis key generators for consistent key naming. */
export const REDIS_KEYS = {
  presence: (userId: string) => `presence:${userId}`,
  presenceChannel: (userId: string) => `channel:presence:${userId}`,
  weeklyLeaderboard: (metric: string) => `leaderboard:weekly:${metric}`,
  editingFile: (teamId: string, fileHash: string) => `editing:${teamId}:${fileHash}`,
  userStreak: (userId: string) => `streak:${userId}`,
} as const;

/** Default file patterns excluded from activity broadcast. */
export const DEFAULT_BLACKLISTED_PATTERNS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.secret',
  '**/secrets/**',
  '**/credentials/**',
] as const;

/** Tier feature flags (higher tiers inherit from lower). */
const FREE_FEATURES = ['presence', 'friends', 'globalLeaderboard'] as const;
const PRO_ADDITIONAL = ['ghostMode', 'customEmoji', 'history30d', 'themes'] as const;
const TEAM_ADDITIONAL = [
  'conflictRadar',
  'privateInstance',
  'slackIntegration',
  'analytics',
] as const;

export const TIER_FEATURES = {
  FREE: FREE_FEATURES,
  PRO: [...FREE_FEATURES, ...PRO_ADDITIONAL] as const,
  TEAM: [...FREE_FEATURES, ...PRO_ADDITIONAL, ...TEAM_ADDITIONAL] as const,
} as const;

/** API rate limits per tier (requests/minute). */
export const RATE_LIMITS = {
  FREE: 60,
  PRO: 120,
  TEAM: 300,
} as const;
