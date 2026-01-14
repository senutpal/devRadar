/**
 * Feature gating utilities for tier-based access control.
 *
 * Provides a central source of truth for feature availability across
 * different subscription tiers. Used by both server and extension.
 */

/**
 * All gated features in the application.
 */
export type Feature =
  | 'presence'
  | 'friends'
  | 'globalLeaderboard'
  | 'friendsLeaderboard'
  | 'streaks'
  | 'achievements'
  | 'poke'
  | 'privacyMode'
  | 'unlimitedFriends'
  | 'ghostMode'
  | 'customStatus'
  | 'history30d'
  | 'themes'
  | 'customEmoji'
  | 'prioritySupport'
  | 'conflictRadar'
  | 'teamCreation'
  | 'teamAnalytics'
  | 'slackIntegration'
  | 'privateLeaderboards'
  | 'adminControls'
  | 'ssoSaml'
  | 'dedicatedSupport';

/**
 * Subscription tier types.
 */
export type SubscriptionTier = 'FREE' | 'PRO' | 'TEAM';

/**
 * Features available in the FREE tier.
 */
const FREE_FEATURES: readonly Feature[] = [
  'presence',
  'friends',
  'globalLeaderboard',
  'friendsLeaderboard',
  'streaks',
  'achievements',
  'poke',
  'privacyMode',
] as const;

/**
 * Additional features unlocked in the PRO tier.
 */
const PRO_ADDITIONAL_FEATURES: readonly Feature[] = [
  'unlimitedFriends',
  'ghostMode',
  'customStatus',
  'history30d',
  'themes',
  'customEmoji',
  'prioritySupport',
] as const;

/**
 * Additional features unlocked in the TEAM tier.
 */
const TEAM_ADDITIONAL_FEATURES: readonly Feature[] = [
  'conflictRadar',
  'teamCreation',
  'teamAnalytics',
  'slackIntegration',
  'privateLeaderboards',
  'adminControls',
  'ssoSaml',
  'dedicatedSupport',
] as const;

/**
 * Complete feature lists for each tier.
 * Higher tiers inherit all features from lower tiers.
 */
export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, readonly Feature[]> = {
  FREE: FREE_FEATURES,
  PRO: [...FREE_FEATURES, ...PRO_ADDITIONAL_FEATURES],
  TEAM: [...FREE_FEATURES, ...PRO_ADDITIONAL_FEATURES, ...TEAM_ADDITIONAL_FEATURES],
} as const;

/**
 * Mapping of features to their minimum required tier.
 */
const FEATURE_TIER_MAP: Record<Feature, SubscriptionTier> = {
  presence: 'FREE',
  friends: 'FREE',
  globalLeaderboard: 'FREE',
  friendsLeaderboard: 'FREE',
  streaks: 'FREE',
  achievements: 'FREE',
  poke: 'FREE',
  privacyMode: 'FREE',
  unlimitedFriends: 'PRO',
  ghostMode: 'PRO',
  customStatus: 'PRO',
  history30d: 'PRO',
  themes: 'PRO',
  customEmoji: 'PRO',
  prioritySupport: 'PRO',
  conflictRadar: 'TEAM',
  teamCreation: 'TEAM',
  teamAnalytics: 'TEAM',
  slackIntegration: 'TEAM',
  privateLeaderboards: 'TEAM',
  adminControls: 'TEAM',
  ssoSaml: 'TEAM',
  dedicatedSupport: 'TEAM',
} as const;

/**
 * Tier hierarchy for comparison.
 */
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  PRO: 1,
  TEAM: 2,
} as const;

/**
 * Checks if a user with the given tier has access to a feature.
 * @param tier - The user's subscription tier
 * @param feature - The feature to check access for
 * @returns true if the user has access to the feature
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: Feature): boolean {
  return SUBSCRIPTION_FEATURES[tier].includes(feature);
}

/**
 * Gets the minimum tier required for a feature.
 * @param feature - The feature to check
 * @returns The minimum tier required
 */
export function getRequiredTier(feature: Feature): SubscriptionTier {
  return FEATURE_TIER_MAP[feature];
}

/**
 * Gets the upgrade path for a user to access a feature.
 * @param currentTier - The user's current tier
 * @param feature - The feature they want to access
 * @returns The tier they need to upgrade to, or null if they already have access
 */
export function getUpgradePath(
  currentTier: SubscriptionTier,
  feature: Feature
): SubscriptionTier | null {
  if (hasFeatureAccess(currentTier, feature)) {
    return null;
  }
  return getRequiredTier(feature);
}

/**
 * Compares two tiers.
 * @param a - First tier
 * @param b - Second tier
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
export function compareTiers(a: SubscriptionTier, b: SubscriptionTier): number {
  return TIER_HIERARCHY[a] - TIER_HIERARCHY[b];
}

/**
 * Checks if tier A is at least as high as tier B.
 * @param userTier - The tier to check
 * @param requiredTier - The minimum required tier
 * @returns true if userTier >= requiredTier
 */
export function isTierAtLeast(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Human-readable feature descriptions for UI display.
 */
export const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  presence: 'Real-time presence status',
  friends: 'Friends list with activity',
  globalLeaderboard: 'Global coding leaderboards',
  friendsLeaderboard: 'Friends leaderboard',
  streaks: 'Coding streak tracking',
  achievements: 'GitHub achievements',
  poke: 'Poke friends',
  privacyMode: 'Hide activity details',
  unlimitedFriends: 'Unlimited friends',
  ghostMode: 'Go completely invisible',
  customStatus: 'Custom status messages',
  history30d: '30-day activity history',
  themes: 'Custom themes',
  customEmoji: 'Custom emoji reactions',
  prioritySupport: 'Priority support',
  conflictRadar: 'Merge conflict detection',
  teamCreation: 'Create and manage teams',
  teamAnalytics: 'Team analytics dashboard',
  slackIntegration: 'Slack integration',
  privateLeaderboards: 'Private team leaderboards',
  adminControls: 'Admin controls',
  ssoSaml: 'SSO & SAML authentication',
  dedicatedSupport: 'Dedicated support',
} as const;
