# =============================================================================
# DevRadar Server Dockerfile
# Multi-stage build for minimal production image
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

# =============================================================================
# Stage 1: Builder - Install deps and build
# =============================================================================
FROM base AS builder

# Copy workspace configuration files first (for layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy all package.json files to leverage Docker layer caching
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set dummy DATABASE_URL for Prisma generate (doesn't need real connection)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV SHADOW_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/shadow"

# Generate Prisma Client
RUN pnpm --filter @devradar/server db:generate

# Build shared package (server depends on it)
RUN pnpm --filter @devradar/shared build

# Build server (now using esbuild - produces single bundled file)
RUN pnpm --filter @devradar/server build

# =============================================================================
# Stage 2: Runner - Production image with all dependencies
# =============================================================================
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 devradar

# Copy the entire workspace from builder (includes node_modules with pnpm structure)
COPY --from=builder --chown=devradar:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=devradar:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder --chown=devradar:nodejs /app/packages ./packages

# Copy the bundled server
COPY --from=builder --chown=devradar:nodejs /app/apps/server/dist ./apps/server/dist

# Copy Prisma generated client (required at runtime)
COPY --from=builder --chown=devradar:nodejs /app/apps/server/src/generated ./apps/server/src/generated

# Copy package.json files for Node.js module resolution
COPY --from=builder --chown=devradar:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=devradar:nodejs /app/package.json ./package.json

USER devradar

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

WORKDIR /app/apps/server

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]