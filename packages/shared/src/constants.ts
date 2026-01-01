/**
 * Presence TTL in seconds (60 seconds).
 * Set to 2x HEARTBEAT_INTERVAL to tolerate missed heartbeats.
 */
export const PRESENCE_TTL_SECONDS = 60;

/**
 * Heartbeat interval in milliseconds (30 seconds).
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Idle threshold in milliseconds (5 minutes).
 */
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * WebSocket reconnection configuration.
 */
export const WS_RECONNECT_CONFIG = {
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  multiplier: 2,
  maxAttempts: 10,
} as const;

/**
 * Redis key patterns.
 */
export const REDIS_KEYS = {
  presence: (userId: string) => `presence:${userId}`,
  presenceChannel: (userId: string) => `channel:presence:${userId}`,
  weeklyLeaderboard: (metric: string) => `leaderboard:weekly:${metric}`,
  editingFile: (teamId: string, fileHash: string) => `editing:${teamId}:${fileHash}`,
  userStreak: (userId: string) => `streak:${userId}`,
} as const;

/**
 * Files that are never broadcasted for privacy.
 */
export const DEFAULT_BLACKLISTED_PATTERNS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.secret',
  '**/secrets/**',
  '**/credentials/**',
] as const;

/**
 * Tier feature flags.
 */
export const TIER_FEATURES = {
  HACKER: ['presence', 'friends', 'globalLeaderboard'] as const,
  PRO: [
    'presence',
    'friends',
    'globalLeaderboard',
    'ghostMode',
    'customEmoji',
    'history30d',
    'themes',
  ] as const,
  TEAM: [
    'presence',
    'friends',
    'globalLeaderboard',
    'ghostMode',
    'customEmoji',
    'history30d',
    'themes',
    'conflictRadar',
    'privateInstance',
    'slackIntegration',
    'analytics',
  ] as const,
} as const;

/**
 * API rate limits per tier (requests per minute).
 */
export const RATE_LIMITS = {
  HACKER: 60,
  PRO: 120,
  TEAM: 300,
} as const;
