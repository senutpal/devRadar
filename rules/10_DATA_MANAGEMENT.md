# 10. Data Management

> **Principle**: Data is the new oil. Treat it with respect—for both the user and the regulator.

---

## 19. Database Standards

### Database Selection

| Use Case                     | Database             | Rationale                            |
| ---------------------------- | -------------------- | ------------------------------------ |
| User profiles, relationships | PostgreSQL           | ACID, complex queries, relationships |
| Real-time presence state     | Redis                | Sub-ms latency, TTL, Pub/Sub         |
| Historical analytics         | TimescaleDB          | Time-series optimized                |
| Full-text search             | PostgreSQL (pg_trgm) | Keep stack simple for MVP            |

### PostgreSQL Schema Conventions

```sql
-- Table naming: snake_case, plural
CREATE TABLE users (
  -- Primary key: UUID preferred for distributed systems
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamps: Always include created_at, updated_at
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete: Use deleted_at instead of hard delete for audit
  deleted_at TIMESTAMPTZ NULL,

  -- Business fields
  github_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team'))
);

-- Index naming: idx_{table}_{column(s)}
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_tier ON users(tier) WHERE deleted_at IS NULL;

-- Foreign keys: fk_{table}_{referenced_table}
ALTER TABLE friendships ADD CONSTRAINT fk_friendships_users
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Redis Key Naming

```
# Pattern: {namespace}:{entity}:{id}:{attribute}
presence:user:u_abc123:status      # "online"
presence:user:u_abc123:file        # "auth.ts"
presence:user:u_abc123:project     # "devradar-backend"

# TTL for presence: 60 seconds (auto-expire = offline)
SETEX presence:user:u_abc123:status 60 "online"

# Sets for relationships
friends:user:u_abc123              # SET of friend user IDs
online:friends:u_abc123            # SET of currently online friend IDs

# Pub/Sub channels
channel:presence:u_abc123          # User's presence updates
channel:team:t_xyz789              # Team-wide updates
```

---

## Schema Migration Rules

### Using Prisma Migrate

```bash
# Creating a migration
npx prisma migrate dev --name add_user_streak_field

# Applying in production
npx prisma migrate deploy
```

### Migration File Naming

```
migrations/
├── 20240101120000_create_users_table/
│   └── migration.sql
├── 20240102093000_add_friendships_table/
│   └── migration.sql
└── 20240103150000_add_user_streak_field/
    └── migration.sql
```

### Backward Compatibility Rules

> **Rule**: Every migration must be deployable alongside the previous code version.

| ✅ Safe Changes     | ❌ Unsafe Changes  |
| ------------------- | ------------------ |
| Add nullable column | Drop column        |
| Add table           | Rename column      |
| Add index           | Change column type |
| Add default value   | Remove constraint  |

### Multi-Step Migration Pattern

For breaking changes, use a 3-deploy pattern:

1. **Deploy 1**: Add new column (nullable), write to both old & new.
2. **Deploy 2**: Backfill data, switch reads to new column.
3. **Deploy 3**: Remove old column (after verification period).

---

## Data Retention Policy

### Retention Schedule

| Data Type            | Hot Storage        | Cold Storage | Deletion            |
| -------------------- | ------------------ | ------------ | ------------------- |
| User profile         | Forever            | N/A          | On account deletion |
| Presence status      | 60 seconds (Redis) | N/A          | Auto-expire         |
| Activity history     | 90 days            | 1 year (S3)  | After cold period   |
| Audit logs           | 30 days            | 1 year       | Per compliance      |
| Anonymized analytics | Forever            | Forever      | Never (aggregated)  |

### Automatic Cleanup Jobs

```typescript
/* Daily cleanup job (runs at 2 AM UTC) */
const cleanupOldActivity = async () => {
  const cutoff = subDays(new Date(), 90);

  const deleted = await prisma.userActivity.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      archived: false, // Don't delete already cold-stored
    },
  });

  logger.info({ count: deleted.count }, 'Cleaned up old activity records');
};
```

---

## Data Deletion ("Nuke My Data")

### GDPR Right to Erasure Implementation

```typescript
/* The "Nuclear Option" - full account deletion */
const nukeUserData = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  /* 1. Delete from Redis (immediate) */
  await redis.del(`presence:user:${userId}:*`);
  await redis.srem('online:users', userId);
  /* 2. Remove from friends' lists */
  const friends = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
  });
  for (const f of friends) {
    await redis.srem(`friends:user:${f.userId}`, userId);
    await redis.srem(`friends:user:${f.friendId}`, userId);
  }
  /* 3. Delete PostgreSQL data (cascades to related tables) */
  await prisma.user.delete({ where: { id: userId } });
  /* 4. Delete from analytics (PostHog) */
  await posthog.capture({
    distinctId: userId,
    event: '$delete',
    properties: { $delete: true },
  });
  /* 5. Audit log (anonymized) */
  await auditLog.record({
    action: 'USER_DATA_DELETED',
    resourceId: hashUserId(userId),
    timestamp: new Date(),
  });

  logger.info({ userId: hashUserId(userId) }, 'User data nuked');
};
```

### Data Export (GDPR Right to Access)

```typescript
const exportUserData = async (userId: string): Promise<UserDataExport> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      friendships: true,
      activityHistory: { take: 1000 },
      teamMemberships: true,
    },
  });

  return {
    profile: sanitizeProfile(user),
    friends: user.friendships.map((f) => f.friendId),
    activityHistory: user.activityHistory,
    exportedAt: new Date().toISOString(),
  };
};
```

---

## GDPR/CCPA Compliance

### Data Subject Rights Implementation

| Right         | Implementation   | Endpoint                           |
| ------------- | ---------------- | ---------------------------------- |
| Access        | Data export ZIP  | `GET /api/user/export`             |
| Rectification | Profile update   | `PATCH /api/user/profile`          |
| Erasure       | Nuke My Data     | `DELETE /api/user`                 |
| Portability   | JSON export      | `GET /api/user/export?format=json` |
| Restriction   | Pause processing | `POST /api/user/pause`             |

### Consent Management

```typescript
/* Track explicit consent for optional features */
interface UserConsent {
  userId: string;
  analyticsConsent: boolean; // PostHog tracking
  marketingConsent: boolean; // Email updates
  spotifyConsent: boolean; // Third-party integration
  consentTimestamp: Date;
  ip: string; // Evidence of consent
}
/* Consent must be explicit, not assumed */
const processSpotifyIntegration = async (userId: string) => {
  const consent = await getConsent(userId, 'spotify');
  if (!consent) {
    throw new AuthorizationError('Spotify integration requires explicit consent');
  }
  /* Proceed with integration */
};
```

---

## Encryption Standards

### At Rest

- **Database**: AWS RDS encryption with AES-256.
- **Backups**: Encrypted at rest with separate key.
- **S3**: SSE-S3 or SSE-KMS for cold storage.

### In Transit

- **External**: TLS 1.3 minimum, HSTS enabled.
- **Internal**: mTLS for service-to-service (future).
- **WebSocket**: WSS only, no WS.

### Sensitive Field Encryption

```typescript
/* Application-level encryption for PII */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY!;

const encryptField = (plaintext: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};
/* Fields to encrypt: */
/* - Email addresses */
/* - OAuth tokens (if stored) */
/* - API keys */
```

---

## Backup & Recovery

### Backup Strategy

| Component  | Method                   | Frequency               | Retention  |
| ---------- | ------------------------ | ----------------------- | ---------- |
| PostgreSQL | pg_dump + WAL            | Continuous + Daily full | 30 days    |
| Redis      | RDB snapshots            | Every 5 minutes         | 24 hours   |
| S3         | Cross-region replication | Continuous              | Indefinite |

### Recovery Procedures

- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 5 minutes

### Disaster Recovery Drills

- **Frequency**: Quarterly
- **Scope**: Full restore to staging environment
- **Validation**: Smoke tests on restored data
- **Documentation**: Update runbook after each drill

---

## Data Privacy for DevRadar

### What We Collect vs Don't Collect

| ✅ We Collect           | ❌ We NEVER Collect                   |
| ----------------------- | ------------------------------------- |
| GitHub user ID          | Actual code content                   |
| Username, avatar        | Line-by-line edits                    |
| Current file extension  | Full file paths (unless consented)    |
| Active time (aggregate) | Keystroke timing                      |
| Language being used     | Private repo names (unless consented) |

### Privacy Levels (User Configurable)

```typescript
type PrivacyLevel = 'public' | 'friends' | 'team' | 'private';

interface PresenceBroadcast {
  status: 'online' | 'idle' | 'dnd'; // Always shared if not private
  currentFile?: string; // Based on privacy level
  project?: string; // Based on privacy level
  activeTime?: number; // Based on privacy level
}

const getBroadcastForViewer = (
  data: UserPresence,
  viewerRelation: 'public' | 'friend' | 'teammate',
  userPrivacy: PrivacyLevel
): PresenceBroadcast => {
  /* Only broadcast what privacy level allows */
  if (userPrivacy === 'private') {
    return { status: 'invisible' };
  }
  /* ... privacy filtering logic */
};
```
