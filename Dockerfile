FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    SHADOW_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/shadow"
RUN pnpm --filter @devradar/server db:generate
RUN pnpm --filter @devradar/server build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/src/generated ./src/generated
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "dist/server.js"]