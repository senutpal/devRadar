# DevRadar: Complete Implementation Plan

> **The "Discord Status for VS Code"** - A Real-Time Developer Presence Platform

---

## Executive Summary

DevRadar transforms coding from a solitary activity into a connected multiplayer experience. This plan covers **6 development phases** spanning approximately **16-20 weeks** for a solo/small team.

---

## User Review Required

> [!IMPORTANT]
> **Greenfield Build**: This plan assumes building from scratch using a TypeScript monorepo.

> [!WARNING]
> **Privacy-First Architecture**: All designs prioritize user privacy. We NEVER transmit code content—only metadata and hashes.

---

## Technology Stack

| Layer            | Technology                         | Rationale                                  |
| ---------------- | ---------------------------------- | ------------------------------------------ |
| **Monorepo**     | Turborepo + pnpm                   | Fast builds, shared types                  |
| **Extension**    | VS Code Extension API + TypeScript | Native integration                         |
| **Backend**      | Node.js + Fastify + ws             | Shared types with client, high performance |
| **Hot Storage**  | Redis (Pub/Sub + TTL keys)         | Real-time state, auto-expiry               |
| **Cold Storage** | PostgreSQL + Prisma                | Relational data, type-safe ORM             |
| **Auth**         | GitHub OAuth 2.0                   | Developer-native identity                  |
| **Web**          | Next.js 14 + Tailwind              | Modern React, SSR                          |
| **Infra**        | Docker + Railway/Render            | Simple deployment                          |

---

## Repository Structure

```
devRadar/
├── apps/
│   ├── extension/          # VS Code Extension
│   │   ├── src/
│   │   │   ├── extension.ts
│   │   │   ├── services/
│   │   │   │   ├── activityTracker.ts
│   │   │   │   ├── wsClient.ts
│   │   │   │   └── authService.ts
│   │   │   ├── views/
│   │   │   │   ├── friendsProvider.ts
│   │   │   │   └── statusBar.ts
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/             # Backend API + WebSocket
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── friends.ts
│   │   │   │   └── teams.ts
│   │   │   ├── ws/
│   │   │   │   ├── handler.ts
│   │   │   │   └── presence.ts
│   │   │   ├── services/
│   │   │   │   ├── redis.ts
│   │   │   │   ├── github.ts
│   │   │   │   └── notifications.ts
│   │   │   └── prisma/
│   │   │       └── schema.prisma
│   │   └── package.json
│   │
│   └── web/                # Marketing + Dashboard
│       ├── src/app/
│       │   ├── page.tsx           # Landing
│       │   ├── dashboard/
│       │   ├── pricing/
│       │   └── docs/
│       └── package.json
│
├── packages/
│   ├── shared/             # Shared Types & DTOs
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── validators.ts
│   │   └── package.json
│   │
│   ├── eslint-config/
│   └── tsconfig/
│
├── docker-compose.yml
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

# Phase 0: Foundation (Week 1-2)

**Goal**: Set up monorepo, CI/CD, and development environment.

## 0.1 Monorepo Setup

### [NEW] Root Configuration Files

| File                  | Purpose                      |
| --------------------- | ---------------------------- |
| `package.json`        | Workspace root with scripts  |
| `pnpm-workspace.yaml` | Define workspace packages    |
| `turbo.json`          | Build pipeline configuration |
| `.gitignore`          | Standard ignores             |
| `.env.example`        | Environment template         |

### [NEW] `packages/shared`

```typescript
/* packages/shared/src/types.ts */
export interface UserStatus {
  userId: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activity?: ActivityPayload;
  updatedAt: number;
}

export interface ActivityPayload {
  fileName?: string; // "auth.ts" (can be masked)
  language?: string; // "typescript"
  project?: string; // "my-startup" (can be masked)
  workspace?: string;
  sessionDuration: number; // seconds
  intensity?: number; // 0-100 keystroke velocity
}

export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

export type MessageType =
  | 'STATUS_UPDATE'
  | 'FRIEND_STATUS'
  | 'POKE'
  | 'CONFLICT_ALERT'
  | 'ACHIEVEMENT'
  | 'ERROR';
```

### [NEW] `packages/eslint-config` & `packages/tsconfig`

Shared linting rules and TypeScript configurations.

## 0.2 Development Infrastructure

### [NEW] `docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: devradar
      POSTGRES_USER: devradar
      POSTGRES_PASSWORD: devradar
    ports: ['5432:5432']
```

### [NEW] GitHub Actions CI

| Workflow      | Trigger | Actions                                 |
| ------------- | ------- | --------------------------------------- |
| `ci.yml`      | Push/PR | Lint, Type-check, Test                  |
| `release.yml` | Tag     | Build extension, Publish to Marketplace |

---

# Phase 1: MVP - The Hook (Week 3-6)

**Goal**: Working "Friends List" with real-time presence.

## 1.1 Backend Server

### [NEW] `apps/server/src/server.ts`

- Fastify HTTP server on port 3000
- WebSocket upgrade handling
- Health check endpoint `/health`

### [NEW] `apps/server/src/prisma/schema.prisma`

```prisma
model User {
  id            String   @id @default(cuid())
  githubId      String   @unique
  username      String
  displayName   String?
  avatarUrl     String?
  email         String?
  tier          Tier     @default(FREE)
  privacyMode   Boolean  @default(false)
  createdAt     DateTime @default(now())

  following     Follow[] @relation("Following")
  followers     Follow[] @relation("Followers")
  teams         TeamMember[]
}

model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User @relation("Following", fields: [followerId], references: [id])
  following   User @relation("Followers", fields: [followingId], references: [id])

  @@unique([followerId, followingId])
}

model Team {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  tier      Tier     @default(TEAM)
  createdAt DateTime @default(now())

  members   TeamMember[]
}

model TeamMember {
  id     String @id @default(cuid())
  userId String
  teamId String
  role   Role   @default(MEMBER)

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
}

enum Tier { FREE, PRO, TEAM }
enum Role { OWNER, ADMIN, MEMBER }
```

### [NEW] `apps/server/src/services/redis.ts`

| Redis Key Pattern            | TTL | Purpose                    |
| ---------------------------- | --- | -------------------------- |
| `presence:{userId}`          | 45s | Current status JSON        |
| `channel:presence:{userId}`  | -   | Pub/Sub for status updates |
| `leaderboard:weekly:commits` | 7d  | Sorted set for rankings    |

### [NEW] `apps/server/src/ws/handler.ts`

**Connection Flow**:

1. Client connects with JWT token in query
2. Validate token, extract userId
3. Subscribe to Redis channels for all friends
4. Send initial friend statuses
5. Handle incoming messages (status updates, pokes)

### [NEW] REST API Routes

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/auth/github`   | Initiate OAuth       |
| GET    | `/auth/callback` | OAuth callback       |
| GET    | `/users/me`      | Current user profile |
| GET    | `/users/:id`     | Get user by ID       |
| GET    | `/friends`       | List friends         |
| POST   | `/friends/:id`   | Follow user          |
| DELETE | `/friends/:id`   | Unfollow user        |

## 1.2 VS Code Extension

### [NEW] `apps/extension/package.json`

```json
{
  "name": "devradar",
  "displayName": "DevRadar",
  "description": "Discord Status for VS Code - See what your friends are coding",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "devradar",
          "title": "DevRadar",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "devradar": [
        { "id": "devradar.friends", "name": "Friends" },
        { "id": "devradar.activity", "name": "Activity" }
      ]
    },
    "commands": [
      { "command": "devradar.login", "title": "DevRadar: Login with GitHub" },
      { "command": "devradar.togglePrivacy", "title": "DevRadar: Toggle Privacy Mode" },
      { "command": "devradar.poke", "title": "DevRadar: Poke Friend" }
    ],
    "configuration": {
      "title": "DevRadar",
      "properties": {
        "devradar.privacyMode": { "type": "boolean", "default": false },
        "devradar.showFileName": { "type": "boolean", "default": true },
        "devradar.showProject": { "type": "boolean", "default": true },
        "devradar.blacklistedFiles": { "type": "array", "default": [".env", "*.pem", "*.key"] }
      }
    }
  }
}
```

### [NEW] `apps/extension/src/extension.ts`

Main activation: Initialize services, register commands, create sidebar.

### [NEW] `apps/extension/src/services/activityTracker.ts`

**Debouncing Strategy**:

- Send heartbeat every **30 seconds** if actively coding
- Send immediately on **file switch**
- Send on **debug start/stop**
- Never send on individual keystrokes

### [NEW] `apps/extension/src/services/wsClient.ts`

WebSocket client with:

- Auto-reconnect with exponential backoff
- Message queue for offline resilience
- Heartbeat ping/pong

### [NEW] `apps/extension/src/views/friendsProvider.ts`

TreeView showing:

- 🟢 Online friends with current activity
- 🟡 Idle friends (no activity 5+ min)
- ⚫ Offline friends
- Each item shows: avatar, name, "Coding TypeScript in auth.ts"

---

# Phase 2: Gamification (Week 7-10)

**Goal**: Retention through dopamine mechanics.

## 2.1 Features

### Streaks & Stats

| Feature      | Implementation                                   |
| ------------ | ------------------------------------------------ |
| Daily Streak | Redis key `streak:{userId}` with daily increment |
| Weekly Stats | PostgreSQL aggregation job (cron)                |
| Session Time | Client-tracked, sent in heartbeat                |

### Leaderboards

```typescript
/* Redis Sorted Sets */
ZADD leaderboard:weekly:time {score: totalSeconds, member: userId}
ZADD leaderboard:weekly:commits {score: commitCount, member: userId}
ZREVRANGE leaderboard:weekly:time 0 9 WITHSCORES // Top 10
```

### Live Heatmaps

- Client calculates `intensity` (0-100) based on keystroke velocity
- Aggregated in extension: "Your network is 🔥 active right now!"

### Boss Battles (GitHub Webhook)

```
POST /webhooks/github
→ Parse "issues" event with action "closed"
→ Find user by GitHub ID
→ Broadcast "ACHIEVEMENT" message to followers
→ Store in achievements table
```

## 2.2 New Components

### [NEW] `apps/server/src/routes/stats.ts`

### [NEW] `apps/server/src/routes/leaderboards.ts`

### [NEW] `apps/server/src/routes/webhooks.ts`

### [MODIFY] Extension sidebar to show streaks, mini-leaderboard

---

# Phase 3: B2B & Teams (Week 11-14)

**Goal**: Premium features for distributed teams.

## 3.1 Merge Conflict Radar

**How It Works**:

1. Client hashes file path: `SHA256(project_root + relative_path)`
2. Sends hash with status update
3. Server stores: `editing:{teamId}:{fileHash}` → `[userId1, userId2]`
4. If multiple users on same hash → Push `CONFLICT_ALERT`

### [NEW] `apps/server/src/services/conflictRadar.ts`

```typescript
async function checkConflicts(userId: string, teamId: string, fileHash: string) {
  const key = `editing:${teamId}:${fileHash}`;
  const editors = await redis.smembers(key);

  if (editors.length > 0 && !editors.includes(userId)) {
    /* Notify all editors */
    for (const editorId of editors) {
      pubsub.publish(`channel:presence:${editorId}`, {
        type: 'CONFLICT_ALERT',
        payload: { fileHash, editors: [...editors, userId] },
      });
    }
  }

  await redis.sadd(key, userId);
  await redis.expire(key, 300); // 5 min TTL
}
```

## 3.2 Team Management

### [NEW] REST Endpoints

| Method | Endpoint                     | Description      |
| ------ | ---------------------------- | ---------------- |
| POST   | `/teams`                     | Create team      |
| GET    | `/teams/:id`                 | Get team details |
| POST   | `/teams/:id/invite`          | Invite member    |
| DELETE | `/teams/:id/members/:userId` | Remove member    |

### [NEW] Dashboard Pages

- `/dashboard/team` - Team overview
- `/dashboard/team/settings` - Team settings
- `/dashboard/team/analytics` - Velocity metrics

## 3.3 Slack Integration

### [NEW] `apps/server/src/integrations/slack.ts`

- OAuth flow for Slack workspace
- Post daily summary to channel
- `/devradar status` slash command

---

# Phase 4: Marketing Website (Week 15-16)

**Goal**: Convert visitors to users.

## 4.1 Landing Page (`apps/web`)

### Sections

| Section      | Content                                              |
| ------------ | ---------------------------------------------------- |
| Hero         | "The Discord Status for VS Code" + animated demo GIF |
| Features     | 3-column grid with icons                             |
| Social Proof | "Join 10,000+ developers" (aspirational)             |
| Pricing      | Tiers table with CTA buttons                         |
| FAQ          | Common privacy/security questions                    |
| Footer       | Links, legal, social                                 |

### [NEW] Key Pages

| Route        | Purpose                        |
| ------------ | ------------------------------ |
| `/`          | Landing page                   |
| `/pricing`   | Pricing details                |
| `/docs`      | Documentation                  |
| `/privacy`   | Privacy policy                 |
| `/terms`     | Terms of service               |
| `/dashboard` | User dashboard (auth required) |

## 4.2 SEO & Virality

- Open Graph images for sharing
- "Share Your Streak" → Generate image card
- VS Code Marketplace README with animated GIF

---

# Phase 5: Monetization & Scaling (Week 17-20)

**Goal**: Implement subscription system and prepare for scale.

## 5.1 Stripe Integration

### [NEW] `apps/server/src/services/stripe.ts`

| Webhook Event                   | Action             |
| ------------------------------- | ------------------ |
| `checkout.session.completed`    | Upgrade user tier  |
| `customer.subscription.deleted` | Downgrade to free  |
| `invoice.payment_failed`        | Send warning email |

### [NEW] Endpoints

| Method | Endpoint            | Description                    |
| ------ | ------------------- | ------------------------------ |
| POST   | `/billing/checkout` | Create Stripe checkout session |
| POST   | `/billing/portal`   | Customer portal link           |
| POST   | `/billing/webhooks` | Stripe webhook handler         |

## 5.2 Feature Gating

```typescript
/* packages/shared/src/features.ts */
export const TIER_FEATURES = {
  FREE: ['presence', 'friends', 'globalLeaderboard'],
  PRO: ['...FREE', 'ghostMode', 'customEmoji', 'history30d', 'themes'],
  TEAM: ['...PRO', 'conflictRadar', 'privateInstance', 'slackIntegration', 'analytics'],
};
```

## 5.3 Infrastructure Scaling

| Component  | Scaling Strategy                      |
| ---------- | ------------------------------------- |
| WebSocket  | Horizontal scaling with Redis adapter |
| API        | Stateless, behind load balancer       |
| Redis      | Redis Cluster for high availability   |
| PostgreSQL | Read replicas for analytics queries   |

---

# Phase 6: Additional Features (Post-Launch)

## 6.1 Future Roadmap

| Feature                      | Priority | Description                      |
| ---------------------------- | -------- | -------------------------------- |
| **Spotify Integration**      | Medium   | Show "Listening to..." status    |
| **Stack Overflow Detection** | Low      | Fun "Ctrl+C/V" detection         |
| **Custom Status Messages**   | Medium   | "Taking a break ☕"              |
| **Focus Mode**               | High     | "Deep Work" status with auto-DND |
| **Mobile App**               | Low      | View friends on mobile           |
| **Browser Extension**        | Medium   | Presence for web-based IDEs      |

## 6.2 Analytics & Observability

| Tool                  | Purpose                |
| --------------------- | ---------------------- |
| PostHog (self-hosted) | Product analytics      |
| Sentry                | Error tracking         |
| Prometheus + Grafana  | Infrastructure metrics |

---

# Verification Plan

## Automated Tests

| Type        | Tool                | Coverage Target          |
| ----------- | ------------------- | ------------------------ |
| Unit        | Vitest              | 80% for shared, services |
| Integration | Vitest + Supertest  | API routes               |
| E2E         | Playwright          | Critical user flows      |
| Extension   | VS Code Test Runner | Core functionality       |

## Manual Testing Protocol

### "The 3-Window Test"

1. Window A: User 1 (following User 2)
2. Window B: User 2 (following User 1)
3. Window C: User 3 (no relationship)
4. ✅ Verify A sees B's status, B sees A's status
5. ✅ Verify C sees nothing
6. ✅ Kill server → Verify reconnect

### Privacy Tests

1. Enable Privacy Mode → Status becomes "Incognito"
2. Blacklist `.env` → File never broadcasted
3. "Nuke My Data" → All records deleted within 24h

---

# Timeline Summary

| Phase           | Duration   | Deliverable                         |
| --------------- | ---------- | ----------------------------------- |
| 0: Foundation   | Week 1-2   | Monorepo, CI/CD, Docker             |
| 1: MVP          | Week 3-6   | Friends list, presence, poke        |
| 2: Gamification | Week 7-10  | Streaks, leaderboards, achievements |
| 3: B2B/Teams    | Week 11-14 | Conflict radar, team management     |
| 4: Website      | Week 15-16 | Landing page, docs, dashboard       |
| 5: Monetization | Week 17-20 | Stripe, feature gates, scaling      |

---

# Risk Mitigation

| Risk                      | Mitigation                                            |
| ------------------------- | ----------------------------------------------------- |
| **"Boss Monitor" Fear**   | Privacy-first design, incognito mode, clear marketing |
| **WebSocket Scalability** | Redis Pub/Sub, horizontal scaling from day 1          |
| **GDPR Compliance**       | Self-hosted analytics, data deletion API              |
| **Marketplace Rejection** | Follow all VS Code extension guidelines               |
| **User Adoption**         | Focus on viral loops, influencer marketing            |

---

> **Next Step**: Approve this plan to begin Phase 0 implementation.
