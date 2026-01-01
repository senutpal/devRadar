/**
 * Database Service
 *
 * Prisma 7 client with PostgreSQL adapter for direct database connections.
 * Follows hexagonal architecture - this is a secondary adapter.
 */

import { PrismaPg } from '@prisma/adapter-pg';

import { env, isDevelopment } from '@/config';
import { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';

/**
 * Prisma client singleton instance.
 */
let prisma: PrismaClient | null = null;

/**
 * Get or create the Prisma client instance.
 * Uses Prisma 7's adapter pattern for database connections.
 *
 * @returns Prisma client instance
 */
export function getDb(): PrismaClient {
  if (!prisma) {
    // Prisma 7 uses adapter pattern with connectionString
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

    prisma = new PrismaClient({
      adapter,
      log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    logger.info('Database client initialized with Prisma 7 adapter');
  }

  return prisma;
}

/**
 * Connect to the database.
 * Call this during server startup.
 */
export async function connectDb(): Promise<void> {
  const db = getDb();

  try {
    await db.$connect();
    logger.info('✅ Connected to PostgreSQL database');
  } catch (error) {
    logger.fatal({ error }, '❌ Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from the database.
 * Call this during graceful shutdown.
 */
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Prisma client disconnected');
  }
}

/**
 * Health check - verify database connectivity.
 *
 * @returns true if database is reachable
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Export db as convenient alias
export const db = getDb();
