# DevRadar 🛰️

**The "Discord" for VS Code** — Real-time social presence for developers.

> Coding is lonely. DevRadar makes it a multiplayer experience without the friction of screen sharing.

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/devradar/devradar/ci.yml?label=CI)](https://github.com/devradar/devradar/actions)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker & Docker Compose
- VS Code 1.85+

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/devradar/devradar.git
cd devradar

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (Redis + PostgreSQL)
docker-compose up -d

# 4. Set up environment
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# 5. Run database migrations
pnpm db:migrate

# 6. Start development servers
pnpm dev
```

### Verify Setup

```bash
# Check all services are running
pnpm health-check

# Run tests
pnpm test

# Open VS Code extension in development mode
pnpm dev:extension
```

---

## 🏗️ Architecture

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   VS Code       │────▶│   WebSocket     │────▶│     Redis       │
│   Extension     │◀────│   Server        │◀────│   (Pub/Sub)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   REST API      │────▶│   PostgreSQL    │
                        │   (Fastify)     │◀────│   (Users/Data)  │
                        └─────────────────┘     └─────────────────┘
```

### Tech Stack

| Layer        | Technology               | Purpose                         |
| ------------ | ------------------------ | ------------------------------- |
| Extension    | TypeScript + VS Code API | Client presence tracking        |
| Backend      | Node.js + Fastify        | REST API + WebSocket server     |
| Real-time    | WebSocket (ws)           | Persistent presence connections |
| Hot Storage  | Redis                    | Ephemeral presence state (TTL)  |
| Cold Storage | PostgreSQL + Prisma      | Users, relationships, history   |
| Infra        | Docker + Kubernetes      | Container orchestration         |

---

## 📁 Project Structure

```text
devradar/
├── apps/
│   ├── api/                 # Fastify REST API
│   ├── ws/                  # WebSocket server
│   ├── web/                 # Landing page (Next.js)
│   └── extension/           # VS Code extension
├── packages/
│   ├── core/                # Shared types, DTOs, validators
│   ├── ui/                  # Shared React components
│   ├── database/            # Prisma schema & client
│   └── tsconfig/            # Shared TypeScript config
├── rules/                   # Engineering guidelines
│   ├── 00_INDEX.md          # Documentation index
│   └── ...                  # Standards & policies
├── docs/
│   └── adr/                 # Architecture Decision Records
├── ops/
│   └── runbooks/            # Operational runbooks
└── tools/                   # Scripts & utilities
```

---

## 🔧 Development

### Available Commands

```bash
# Development
pnpm dev                 # Start all services in dev mode
pnpm dev:api             # Start API server only
pnpm dev:ws              # Start WebSocket server only
pnpm dev:extension       # Launch extension in VS Code debug mode

# Testing
pnpm test                # Run all tests
pnpm test:unit           # Unit tests only
pnpm test:e2e            # End-to-end tests
pnpm test:coverage       # Generate coverage report

# Code Quality
pnpm lint                # Run ESLint
pnpm format              # Run Prettier
pnpm typecheck           # TypeScript type checking

# Database
pnpm db:migrate          # Run migrations
pnpm db:seed             # Seed development data
pnpm db:studio           # Open Prisma Studio

# Build
pnpm build               # Build all packages
pnpm build:extension     # Build VS Code extension (.vsix)
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/devradar"
REDIS_URL="redis://localhost:6379"
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

# Optional
LOG_LEVEL="debug"
JWT_SECRET="randomly-generated-secret"
```

See [.env.example](./.env.example) for all available options.

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](./LICENSE) file for details.
