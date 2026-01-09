/** Presence TTL in seconds. Set to 2x heartbeat interval to tolerate missed beats. */
export const PRESENCE_TTL_SECONDS = 60;

/** Heartbeat interval (30 seconds). */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Idle threshold (5 minutes of no activity). */
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

// ============================================================================
// Phase 2: Gamification Constants
// ============================================================================

/** Streak TTL in seconds (25 hours - grace period for timezone flexibility). */
export const STREAK_TTL_SECONDS = 25 * 60 * 60;

/** Daily session key TTL in seconds (48 hours for overlap). */
export const SESSION_TTL_SECONDS = 48 * 60 * 60;

/** Network activity bucket TTL in seconds (2 minutes). */
export const NETWORK_ACTIVITY_TTL_SECONDS = 120;

/** Threshold for network "hot" status (10+ active users). */
export const NETWORK_HOT_THRESHOLD = 10;

/** WebSocket reconnection with exponential backoff. */
export const WS_RECONNECT_CONFIG = {
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  multiplier: 2,
  maxAttempts: 10,
} as const;

/** Redis key generators for consistent key naming. */
export const REDIS_KEYS = {
  // Presence (Phase 1)
  presence: (userId: string) => `presence:${userId}`,
  presenceChannel: (userId: string) => `channel:presence:${userId}`,
  editingFile: (teamId: string, fileHash: string) => `editing:${teamId}:${fileHash}`,

  // Streaks (Phase 2)
  userStreak: (userId: string) => `streak:${userId}`,
  streakData: (userId: string) => `streak:data:${userId}`,

  // Leaderboards (Phase 2)
  weeklyLeaderboard: (metric: string) => `leaderboard:weekly:${metric}`,
  friendsLeaderboard: (userId: string) => `leaderboard:friends:${userId}`,

  // Session tracking (Phase 2)
  dailySession: (userId: string, date: string) => `session:${userId}:${date}`,

  // Network activity (Phase 2)
  networkActivity: () => `network:activity`,
  networkIntensity: (minute: number) => `network:intensity:${String(minute)}`,

  // Webhook deduplication (Phase 2)
  webhookDelivery: 'webhook:github:delivery',
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

/**
 * Achievement definitions with titles and descriptions.
 * Used for creating achievements and displaying in UI.
 */
export const ACHIEVEMENTS = {
  ISSUE_CLOSED: {
    title: '🐛 Bug Slayer',
    description: 'Closed an issue on GitHub',
  },
  PR_MERGED: {
    title: '🎉 Merge Master',
    description: 'Merged a pull request',
  },
  STREAK_7: {
    title: '🔥 Week Warrior',
    description: 'Maintained a 7-day coding streak',
  },
  STREAK_30: {
    title: '⚡ Monthly Machine',
    description: 'Maintained a 30-day coding streak',
  },
  STREAK_100: {
    title: '🏆 Century Coder',
    description: 'Maintained a 100-day coding streak',
  },
  FIRST_HOUR: {
    title: '⏰ First Hour',
    description: 'Coded for your first full hour',
  },
  NIGHT_OWL: {
    title: '🦉 Night Owl',
    description: 'Coded past midnight',
  },
  EARLY_BIRD: {
    title: '🌅 Early Bird',
    description: 'Started coding before 6 AM',
  },
} as const;

/** Achievement type from the ACHIEVEMENTS keys. */
export type AchievementTypeKey = keyof typeof ACHIEVEMENTS;
