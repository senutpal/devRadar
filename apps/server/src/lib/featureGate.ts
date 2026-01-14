/**
 * Feature gate utilities for tier-based access control.
 *
 * Provides Fastify preHandler hooks for restricting route access
 * based on user subscription tier.
 */

import {
  type Feature,
  type SubscriptionTier,
  FEATURE_DESCRIPTIONS,
  hasFeatureAccess,
  getRequiredTier,
  isTierAtLeast,
} from '@devradar/shared';

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

import { AuthorizationError } from '@/lib/errors';
import { getDb } from '@/services/db';

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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime check needed
    if (!request.user || typeof request.user !== 'object') {
      throw new AuthorizationError('User not authenticated');
    }

    const userPayload = request.user as { userId?: unknown };
    if (typeof userPayload.userId !== 'string') {
      throw new AuthorizationError('Invalid user ID');
    }

    const { userId } = userPayload;
    const db = getDb();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new AuthorizationError('User not found');
    }

    const validTiers: SubscriptionTier[] = ['FREE', 'PRO', 'TEAM'];
    const userTier = validTiers.includes(user.tier as SubscriptionTier)
      ? (user.tier as SubscriptionTier)
      : 'FREE';

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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime check needed
    if (!request.user || typeof request.user !== 'object') {
      throw new AuthorizationError('User not authenticated');
    }

    const userPayload = request.user as { userId?: unknown };
    if (typeof userPayload.userId !== 'string') {
      throw new AuthorizationError('Invalid user ID');
    }

    const { userId } = userPayload;
    const db = getDb();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new AuthorizationError('User not found');
    }

    const validTiers: SubscriptionTier[] = ['FREE', 'PRO', 'TEAM'];
    const userTier = validTiers.includes(user.tier as SubscriptionTier)
      ? (user.tier as SubscriptionTier)
      : 'FREE';

    if (!isTierAtLeast(userTier, requiredTier)) {
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

  const validTiers: SubscriptionTier[] = ['FREE', 'PRO', 'TEAM'];
  const userTier = validTiers.includes(user.tier as SubscriptionTier)
    ? (user.tier as SubscriptionTier)
    : 'FREE';

  return hasFeatureAccess(userTier, feature);
}
