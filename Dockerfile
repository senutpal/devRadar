FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
# Copy all package.jsons
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    SHADOW_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/shadow"

# Generate Prisma Client
RUN pnpm --filter @devradar/server db:generate

# Build packages
RUN pnpm --filter @devradar/shared build
RUN pnpm --filter @devradar/server build

# Create a pruned deployment for the server
# This includes the correctly hoisted node_modules for production
RUN pnpm --filter @devradar/server deploy --prod /prod/server

# Copy built artifacts to the deployment directory
# We need to manually copy dist and generated files because pnpm deploy 
# generally respects .gitignore and might miss build artifacts that are ignored
RUN cp -r apps/server/dist /prod/server/dist
RUN mkdir -p /prod/server/src
RUN cp -r apps/server/src/generated /prod/server/src/generated

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 devradar

# Copy the fully prepared application from builder
COPY --from=builder /prod/server ./

RUN chown -R devradar:nodejs /app

USER devradar

ENV NODE_ENV=production \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]