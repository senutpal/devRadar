# server

fastify rest api + websocket server for devradar.

## getting started

```
pnpm install
docker-compose up -d
cp .env.example .env
pnpm db:migrate
pnpm dev
```

## commands

```
pnpm dev         # start with hot reload (tsx watch)
pnpm build       # build for production (esbuild)
pnpm start       # start production server
pnpm check-types # run typescript type checking
pnpm lint        # lint code
pnpm lint:fix    # lint and fix issues
pnpm clean       # clean build artifacts
```

## database commands

```
pnpm db:generate   # generate prisma client
pnpm db:push       # push schema to database
pnpm db:migrate    # run migrations
pnpm db:studio     # open prisma studio
```

## environment variables

required:

- database_url - postgresql connection string
- jwt_secret - signing secret for tokens
- github_client_id - oauth client id
- github_client_secret - oauth client secret

optional:

- redis_url - redis connection string
- log_level - logging level (default: info)
- server_url - public server url
- slack_client_id - slack integration
- razorpay_key_id - payments

## api endpoints

rest api:

- auth: /auth/\* (github oauth, jwt)
- users: /users/\* (profile, settings)
- friends: /friends/\* (relationships, requests)
- presence: /presence/\* (status, activity)
- teams: /teams/\* (team management)

websocket:

- /ws - real-time presence connections

## license

agpl-3.0
