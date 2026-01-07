# Contributing to DevRadar

First off, thank you for considering contributing to DevRadar! 🎉

This document provides guidelines and best practices for contributing to the project. Following these helps maintain code quality and makes the review process smoother for everyone.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Getting Help](#getting-help)

---

## Code of Conduct

This project adheres to our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@devradar.io.

---

## Getting Started

### Prerequisites

- Node.js 20+ (we recommend using `nvm`)
- pnpm 8+ (installed globally: `npm install -g pnpm`)
- Docker & Docker Compose
- Git

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/devradar.git
   cd devradar
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/devradar/devradar.git
   ```

4. **Install dependencies**

   ```bash
   pnpm install
   ```

5. **Start infrastructure**

   ```bash
   docker-compose up -d
   ```

6. **Set up environment**

   ```bash
   cp .env.example .env
   # Edit .env with your GitHub OAuth credentials
   ```

7. **Run migrations**

   ```bash
   pnpm db:migrate
   ```

8. **Verify setup**
   ```bash
   pnpm test
   pnpm dev
   ```

---

## Development Workflow

### Branch Naming Convention

| Type          | Pattern                         | Example                       |
| ------------- | ------------------------------- | ----------------------------- |
| Feature       | `feature/<ticket>-<short-desc>` | `feature/DR-123-ghost-mode`   |
| Bug fix       | `fix/<ticket>-<short-desc>`     | `fix/DR-456-presence-timeout` |
| Documentation | `docs/<short-desc>`             | `docs/update-api-reference`   |
| Refactor      | `refactor/<short-desc>`         | `refactor/presence-service`   |

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main
```

### Working on a Feature

```bash
# Create a new branch from main
git checkout main
git pull upstream main
git checkout -b feature/DR-123-my-feature

# Make your changes
# ... edit files ...

# Commit your changes
git add .
git commit -m "feat: add my awesome feature"

# Push to your fork
git push origin feature/DR-123-my-feature
```

---

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

### PR Title Format

```
<type>(<scope>): <description>

Examples:
feat(extension): add Spotify integration
fix(api): resolve presence timeout issue
docs(readme): update installation instructions
```

### PR Description

Use our [PR template](./rules/TEMPLATES/PR_TEMPLATE.md) which includes:

- Type of change
- Description (What, Why, How)
- Testing performed
- Screenshots (for UI changes)
- Checklist

### Review Process

1. **Create PR** → Automated checks run
2. **Code Review** → At least 1 approval required
3. **Address Feedback** → Make requested changes
4. **Merge** → Maintainer merges after approval

### Review SLA

- We aim to provide initial feedback within 24-48 hours
- Please be patient with maintainers who volunteer their time

---

## Coding Standards

All code must follow our engineering guidelines. Key points:

### TypeScript

- Strict mode enabled (`strict: true`)
- No `any` without justification
- Use Zod for runtime validation

### File Structure

```typescript
/* 1. Imports (third-party → internal → styles) */
import { z } from 'zod';
import { logger } from '@devradar/core';
import styles from './Component.module.css';
/* 2. Types/Constants */
const MAX_RETRIES = 3;
interface Props { ... }
/* 3. Main export */
export const Component = () => { ... };
/* 4. Sub-components/helpers */
const HelperComponent = () => { ... };
```

### Naming Conventions

| Type               | Convention        | Example                |
| ------------------ | ----------------- | ---------------------- |
| Files (functions)  | `camelCase.ts`    | `usePresence.ts`       |
| Files (components) | `PascalCase.tsx`  | `FriendsList.tsx`      |
| Classes            | `PascalCase`      | `PresenceService`      |
| Functions          | `camelCase`       | `getPresence`          |
| Constants          | `SCREAMING_SNAKE` | `MAX_CONNECTIONS`      |
| Interfaces         | `PascalCase`      | `User`, `PresenceData` |

### Code Quality Rules

- Max file length: 400 lines
- Max function length: 50 lines
- No `console.log` (use structured logger)
- No commented-out code
- No magic numbers (use constants)

For complete standards, see [03_CODING_STANDARDS.md](./rules/03_CODING_STANDARDS.md).

---

## Testing Requirements

### Test Pyramid

- **Unit Tests (70%)**: Fast, isolated, mock external deps
- **Integration Tests (20%)**: Database, API interactions
- **E2E Tests (10%)**: Full user flows (Playwright)

### Minimum Coverage

- **New code**: 80% line coverage
- **Overall project**: Maintain 80%+

### Writing Tests

```typescript
/* Unit test example */
describe('PresenceService', () => {
  describe('getPresence', () => {
    it('should return user presence when online', async () => {
      /* Arrange */
      const mockRedis = createMockRedis();
      const service = new PresenceService(mockRedis);
      /* Act */
      const result = await service.getPresence('user-123');
      /* Assert */
      expect(result).toEqual({
        status: 'online',
        lastSeen: expect.any(Date),
      });
    });

    it('should return offline when no presence data', async () => {
      /* Test edge case */
    });
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific package
pnpm test --filter @devradar/api

# Coverage report
pnpm test:coverage
```

---

## Documentation

### When to Update Docs

- Adding new features
- Changing existing behavior
- Modifying APIs
- Adding new configuration options

### Types of Documentation

| Type          | Location        | When                   |
| ------------- | --------------- | ---------------------- |
| Code comments | Inline          | Complex logic          |
| JSDoc         | On exports      | Public APIs            |
| README        | Package root    | Setup/usage            |
| ADR           | `docs/adr/`     | Architecture decisions |
| Runbook       | `ops/runbooks/` | Operational procedures |

### JSDoc Example

```typescript
/**
 * Retrieves the current presence status for a user.
 *
 * @param userId - The unique identifier of the user
 * @returns The user's presence data, or null if not found
 * @throws {AuthorizationError} If the requester cannot view the user
 *
 * @example
 * const presence = await getPresence('user-123');
 * console.log(presence?.status); // 'online'
 */
export const getPresence = async (userId: string): Promise<Presence | null> => {
  /* ... */
};
```

---

## Getting Help

### Resources

- **Documentation**: [`rules/00_INDEX.md`](./rules/00_INDEX.md)
- **Discord**: [Join our community](https://discord.gg/devradar)
- **Discussions**: [GitHub Discussions](https://github.com/devradar/devradar/discussions)

### Asking Questions

1. Search existing issues/discussions first
2. Provide context (OS, Node version, error messages)
3. Include steps to reproduce

### Reporting Bugs

Use the bug report template when opening an issue:

- Clear title describing the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

---

## Recognition

Contributors are recognized in:

- Release notes
- CONTRIBUTORS.md file
- Special Discord role

Thank you for contributing to DevRadar! 💜
