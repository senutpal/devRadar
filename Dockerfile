FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

FROM base AS builder

# Copy workspace configuration files
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

# Set dummy DATABASE_URL for Prisma generate (doesn't need a real connection)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV SHADOW_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/shadow"

# Generate Prisma Client
RUN pnpm --filter @devradar/server db:generate

# Build shared package first (server depends on it)
RUN pnpm --filter @devradar/shared build

# Build server
RUN pnpm --filter @devradar/server build

# Create a production deployment using pnpm deploy
# This creates a standalone directory with all production dependencies
RUN pnpm --filter @devradar/server deploy --prod /prod/server

# Copy build artifacts into the deployment directory
# (pnpm deploy only copies source files, not build output)
RUN cp -r apps/server/dist /prod/server/dist
RUN mkdir -p /prod/server/src/generated
RUN cp -r apps/server/src/generated/prisma /prod/server/src/generated/prisma

FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 devradar

# Copy the fully prepared application from builder
COPY --from=builder --chown=devradar:nodejs /prod/server ./

USER devradar

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]