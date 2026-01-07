# 02. Repository & Structure

## 2. Repository Management

### Standards

- **Structure**: Monorepo (Turborepo) preferred for tight coupling. Multi-repo for distinct microservices.
- **Naming**: `team-project-service` (e.g., `core-dev-radar-backend`, `web-landing-page`). Kebab-case.
- **Templates**: Use `create-t3-app` or internal scaffolding for new services.
- **Mandatory Files**:
  - `README.md`: Setup, Architecture, Run commands.
  - `CONTRIBUTING.md`: How to build/test.
  - `CODEOWNERS`: Direct routing of PRs.
  - `CHANGELOG.md`: Semantic versioning log.

### Monorepo vs Polyrepo Decision Matrix

| Factor         | Choose Monorepo if...                    | Choose Polyrepo if...               |
| -------------- | ---------------------------------------- | ----------------------------------- |
| **Dependency** | Services share huge amount of code/types | Services are completely independent |
| **Deploy**     | Services deployed together (often)       | Services deployed independently     |
| **Team**       | Single team owning multiple services     | Distinct teams with API contracts   |
| **Tooling**    | Unified tooling (One lint, one build)    | Specialized tooling per service     |

> **DevRadar Decision**: **Monorepo** using pnpm workspaces.
> _Reason_: Shared TypeScript types between VS Code Extension, Backend API, and Frontend are critical to avoid drift.

### Repository Templates

| Template Name            | Use Case                      | Location                        |
| ------------------------ | ----------------------------- | ------------------------------- |
| `tmpl-microservice-node` | New Backend Service (Fastify) | `/tools/templates/service-node` |
| `tmpl-react-component`   | New UI Library Component      | `/tools/templates/react-lib`    |
| `tmpl-cli-tool`          | Internal CLI Tool             | `/tools/templates/cli`          |

---

## 3. Project Structure

### Standard Layout

```
/
├── apps/                 # Deployable applications
│   ├── web/              # Brand Website (Next.js)
│   ├── api/              # Main Backend API
│   ├── ws/               # WebSocket Server
│   └── extension/        # VS Code Extension
├── packages/             # Shared libraries
│   ├── ui/               # Components (Storybook)
│   ├── core/             # Business logic / DTOs
│   ├── database/         # Prisma Schema & Client
│   └── tsconfig/         # Shared config
├── tools/                # Scripts & generators
│   ├── generators/       # Plop.js generators
│   └── scripts/          # CI/CD scripts
├── docs/                 # Architecture & Decisions (ADRs)
└── docker-compose.yml
```

### Rules

- **No Circular Dependencies**: Enforced by `madge` or `nx graph`.
- **Isolation**: Tests co-located with code (`*.test.ts`).
- **Build Output**: Always to `/dist` or `/build`. Gitignored.

---

## 4. File & Naming Conventions

### File Naming Rules

| Type                 | Convention                 | Example                           |
| -------------------- | -------------------------- | --------------------------------- |
| **React Components** | PascalCase                 | `UserProfile.tsx`                 |
| **Utilities/Hooks**  | camelCase                  | `useAuth.ts`, `formatDate.ts`     |
| **Classes/Services** | PascalCase                 | `UserService.ts`                  |
| **Types/Interfaces** | PascalCase                 | `User.ts`, `ApiResponse.ts`       |
| **Tests**            | `*.test.ts` or `*.spec.ts` | `UserService.test.ts`             |
| **Configuration**    | kebab-case or standard     | `tsconfig.json`, `jest.config.js` |
| **Scripts**          | kebab-case                 | `generate-token.sh`               |

### Code Naming Rules

- **Classes**: `UserService` (Noun)
- **Functions**: `getUser` (Verb + Noun)
- **Boolean Vars**: `isActive`, `hasPermission` (Prefix with is/has/should)
- **Constants**: `MAX_RETRY_COUNT` (SCREAMING_SNAKE_CASE)
- **Enums**: `UserStatus` (PascalCase), Members: `Active`, `Inactive` (PascalCase)
- **Interfaces**: `User` (Preferred) vs `IUser` (Avoid Hungarian notation)
  - _Exception_: If conflict with Class, use `I` prefix or `UserInterface`.

---

## 20. Dependency Management

- **Process**: New dependencies require Team Lead approval (check bundle size & security).
- **Pinning**: Lockfiles (`package-lock.json`) MUST be committed.
- **Updates**: RenovateBot runs weekly. Majors require manual testing.
- **Vulnerabilities**: `npm audit` blocks build on High/Critical.
- **Transitive**: Do not rely on transitive deps. Declare what you use.

---

## 34. Deprecation & Cleanup

- **Dead Code**: If it's not used, delete it. Git history is your backup.
- **Feature Flags**: Remove flags after successful 100% rollout.
- **API Sunset**:
  1.  Mark `@deprecated` with "Remove by [Date]".
  2.  Add HTTP Warning header.
  3.  Brownout (short failures) 1 month prior.
  4.  Shutdown.

---

## 39. Sunset & Legacy

- **Classification**: "Legacy" = No active development, maintenance only.
- **Migration**: Every Legacy system must have a `MIGRATION.md` plan.
- **Ownership**: Legacy systems effectively owned by "Core Platform" team if original team dissolves.
