/**
 * Feature gate utilities for tier-based access control.
 *
 * Provides Fastify preHandler hooks for restricting route access
 * based on user subscription tier.
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

import { AuthorizationError } from '@/lib/errors';
import { getDb } from '@/services/db';

type Feature =
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

type SubscriptionTier = 'FREE' | 'PRO' | 'TEAM';

const FREE_FEATURES: readonly Feature[] = [
  'presence',
  'friends',
  'globalLeaderboard',
  'friendsLeaderboard',
  'streaks',
  'achievements',
  'poke',
  'privacyMode',
];

const PRO_ADDITIONAL: readonly Feature[] = [
  'unlimitedFriends',
  'ghostMode',
  'customStatus',
  'history30d',
  'themes',
  'customEmoji',
  'prioritySupport',
];

const TEAM_ADDITIONAL: readonly Feature[] = [
  'conflictRadar',
  'teamCreation',
  'teamAnalytics',
  'slackIntegration',
  'privateLeaderboards',
  'adminControls',
  'ssoSaml',
  'dedicatedSupport',
];

const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, readonly Feature[]> = {
  FREE: FREE_FEATURES,
  PRO: [...FREE_FEATURES, ...PRO_ADDITIONAL],
  TEAM: [...FREE_FEATURES, ...PRO_ADDITIONAL, ...TEAM_ADDITIONAL],
};

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
};

const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
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
};

function hasFeatureAccess(tier: SubscriptionTier, feature: Feature): boolean {
  return SUBSCRIPTION_FEATURES[tier].includes(feature);
}

function getRequiredTier(feature: Feature): SubscriptionTier {
  return FEATURE_TIER_MAP[feature];
}

/**
 * Creates a Fastify preHandler hook that checks if the user has access to a feature.
 * Returns a 403 Forbidden error with upgrade information if the user lacks access.
 *
 * @param feature - The feature to require access for
 * @returns A Fastify preHandler hook
 */
export function requireFeature(feature: Feature): preHandlerHookHandler {
  // Fastify preHandler hooks support async functions - Fastify awaits promises internally
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { userId } = request.user as { userId: string };
    const db = getDb();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new AuthorizationError('User not found');
    }

    const userTier = user.tier as SubscriptionTier;

    if (!hasFeatureAccess(userTier, feature)) {
      const requiredTier = getRequiredTier(feature);
      const featureDescription = FEATURE_DESCRIPTIONS[feature];

      throw new AuthorizationError(
        `${featureDescription} requires ${requiredTier} tier. Upgrade at /dashboard/billing`
      );
    }
  };
}

/**
 * Creates a Fastify preHandler hook that checks if the user has at least
 * the specified tier.
 *
 * @param requiredTier - The minimum tier required
 * @returns A Fastify preHandler hook
 */
export function requireTier(requiredTier: SubscriptionTier): preHandlerHookHandler {
  // Fastify preHandler hooks support async functions - Fastify awaits promises internally
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { userId } = request.user as { userId: string };
    const db = getDb();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new AuthorizationError('User not found');
    }

    const tierHierarchy: Record<SubscriptionTier, number> = {
      FREE: 0,
      PRO: 1,
      TEAM: 2,
    };

    // tierHierarchy keys are guaranteed by type assertion on user.tier
    const userTierLevel = tierHierarchy[user.tier as SubscriptionTier];
    const requiredTierLevel = tierHierarchy[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      throw new AuthorizationError(
        `This feature requires ${requiredTier} tier. Upgrade at /dashboard/billing`
      );
    }
  };
}

/**
 * Checks if a user has access to a feature without throwing an error.
 * Useful for conditional logic in handlers.
 *
 * @param userId - The user ID to check
 * @param feature - The feature to check access for
 * @returns true if the user has access
 */
export async function checkFeatureAccess(userId: string, feature: Feature): Promise<boolean> {
  const db = getDb();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    return false;
  }

  return hasFeatureAccess(user.tier as SubscriptionTier, feature);
}
