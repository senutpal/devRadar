/**
 * Conflict Radar Service
 *
 * Detects when multiple team members are editing the same file simultaneously.
 * Uses Redis Sets to track file editors with automatic TTL expiration.
 *
 * Flow:
 * 1. Client hashes file path: SHA256(project_root + relative_path)
 * 2. Sends hash with status update (fileHash + teamId)
 * 3. Server stores in Redis Set: editing:{teamId}:{fileHash} → [userIds]
 * 4. If multiple users on same hash → Push CONFLICT_ALERT to all editors
 */

import { REDIS_KEYS } from '@devradar/shared';

import type { ConflictAlertPayload } from '@devradar/shared';

import { logger } from '@/lib/logger';
import { getRedis, getRedisPublisher } from '@/services/redis';

/** TTL for editing entries in seconds (5 minutes). */
const EDITING_TTL_SECONDS = 300;

/** Result of conflict check operation. */
export interface ConflictCheckResult {
  /** Whether there is a potential conflict (multiple editors). */
  hasConflict: boolean;
  /** Array of all user IDs currently editing this file (including the current user). */
  editors: string[];
}

/**
 * Checks for conflicts when a user starts editing a file and notifies affected users.
 *
 * @param userId - Current user's ID
 * @param teamId - Team ID the user belongs to
 * @param fileHash - SHA256 hash of the file path (first 16 chars)
 * @returns Conflict check result
 */
export async function checkConflicts(
  userId: string,
  teamId: string,
  fileHash: string
): Promise<ConflictCheckResult> {
  const redis = getRedis();
  const key = REDIS_KEYS.editingFile(teamId, fileHash);

  try {
    // Get current editors before adding the new user
    const existingEditors = await redis.smembers(key);

    // Add user to the editing set
    await redis.sadd(key, userId);

    // Refresh TTL on every update (sliding window)
    await redis.expire(key, EDITING_TTL_SECONDS);

    // Check if there are other editors (conflict scenario)
    const hasConflict = existingEditors.length > 0 && !existingEditors.includes(userId);

    // All editors including the current user
    const allEditors = existingEditors.includes(userId)
      ? existingEditors
      : [...existingEditors, userId];

    if (hasConflict) {
      logger.info(
        {
          teamId,
          fileHash,
          editorCount: allEditors.length,
          userId,
        },
        'Potential merge conflict detected'
      );
    }

    return {
      hasConflict,
      editors: allEditors,
    };
  } catch (error) {
    logger.error({ error, teamId, fileHash, userId }, 'Failed to check conflicts');
    return { hasConflict: false, editors: [userId] };
  }
}

/**
 * Publishes a conflict alert to all affected editors via Redis pub/sub.
 *
 * @param editors - Array of user IDs to notify
 * @param payload - Conflict alert payload
 */
export async function publishConflictAlert(
  editors: string[],
  payload: ConflictAlertPayload
): Promise<void> {
  const pub = getRedisPublisher();

  // Publish to each editor's presence channel
  const publishPromises = editors.map(async (editorId) => {
    const channel = REDIS_KEYS.presenceChannel(editorId);
    try {
      await pub.publish(
        channel,
        JSON.stringify({
          type: 'CONFLICT_ALERT',
          payload,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      logger.warn({ error, editorId }, 'Failed to publish conflict alert');
    }
  });

  await Promise.all(publishPromises);
}

/**
 * Clears a user's editing state for a specific file.
 * Called when user switches to a different file.
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @param fileHash - File hash to clear
 */
export async function clearFileEditing(
  userId: string,
  teamId: string,
  fileHash: string
): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.editingFile(teamId, fileHash);

  try {
    await redis.srem(key, userId);
    logger.debug({ userId, teamId, fileHash }, 'Cleared file editing state');
  } catch (error) {
    logger.warn({ error, userId, teamId, fileHash }, 'Failed to clear file editing state');
  }
}

/**
 * Clears all editing states for a user across all files in a team.
 * Called when user disconnects or goes offline.
 *
 * @param userId - User ID
 * @param teamId - Team ID
 */
export async function clearAllUserEditing(userId: string, teamId: string): Promise<void> {
  const redis = getRedis();

  try {
    // Scan for all editing keys for this team and remove user from each
    const pattern = `editing:${teamId}:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const key of keys) {
          pipeline.srem(key, userId);
        }
        await pipeline.exec();
      }
    } while (cursor !== '0');

    logger.debug({ userId, teamId }, 'Cleared all user editing states');
  } catch (error) {
    logger.warn({ error, userId, teamId }, 'Failed to clear all user editing states');
  }
}

/**
 * Gets all users currently editing a specific file.
 *
 * @param teamId - Team ID
 * @param fileHash - File hash
 * @returns Array of user IDs
 */
export async function getFileEditors(teamId: string, fileHash: string): Promise<string[]> {
  const redis = getRedis();
  const key = REDIS_KEYS.editingFile(teamId, fileHash);

  try {
    return await redis.smembers(key);
  } catch (error) {
    logger.warn({ error, teamId, fileHash }, 'Failed to get file editors');
    return [];
  }
}
