# devradar

real-time social presence for developers.

## quick start

```
git clone https://github.com/devradar/devradar.git
cd devradar
pnpm install
docker-compose up -d
cp apps/server/.env.example apps/server/.env
pnpm --filter @devradar/server db:migrate
pnpm dev
```

## structure

```
devradar/
├── apps/
│   ├── extension/     # vs code extension
│   ├── server/         # fastify rest api + websocket server
│   └── web/           # next.js landing page + dashboard
├── packages/
│   ├── shared/        # shared types, validators, constants
│   ├── eslint-config/ # eslint configurations
│   └── tsconfig/      # typescript configuration presets
└── docker-compose.yml # postgresql + redis
```

## tech stack

| layer      | technology            |
| ---------- | --------------------- |
| runtime    | node.js 22+           |
| monorepo   | pnpm + turbo          |
| backend    | fastify + websocket   |
| database   | postgresql + prisma   |
| cache      | redis + ioredis       |
| frontend   | next.js 16 + react 19 |
| styling    | tailwind css v4       |
| validation | zod                   |

## commands

```
pnpm dev              # start all services
pnpm dev:server       # start api/websocket server only
pnpm dev:extension    # launch extension in vs code debug mode
pnpm dev:web          # start web app only
pnpm build            # build all packages
pnpm test             # run tests
pnpm lint             # lint code
pnpm format           # format code
```

## server commands

```
pnpm --filter @devradar/server dev        # dev mode with hot reload
pnpm --filter @devradar/server build      # build for production
pnpm --filter @devradar/server start      # start production server
pnpm --filter @devradar/server db:migrate # run database migrations
pnpm --filter @devradar/server db:studio  # open prisma studio
```

## extension commands

```
pnpm --filter devradar dev       # watch mode for development
pnpm --filter devradar build     # build extension
pnpm --filter devradar package   # create vsix package
```

## license

agpl-3.0
