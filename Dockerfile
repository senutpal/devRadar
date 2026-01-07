FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    SHADOW_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/shadow"
RUN pnpm --filter @devradar/server db:generate
RUN pnpm --filter @devradar/shared build
RUN pnpm --filter @devradar/server build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 devradar

COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=builder /app/packages/shared/dist ./node_modules/@devradar/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@devradar/shared/

COPY --from=builder /app/apps/server/dist ./dist

COPY --from=builder /app/apps/server/src/generated ./src/generated

COPY --from=builder /app/apps/server/package.json ./

RUN chown -R devradar:nodejs /app

USER devradar

ENV NODE_ENV=production \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]