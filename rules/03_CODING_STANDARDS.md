# 03. Coding Standards

## 5. Code Style & Formatting

- **Automation**: `Prettier` is the law. Run on save. `ESLint` standard config enforced.
- **Limits**:
  - File Length: Max 400 lines (Refactor if longer).
  - Function Length: Max 50 lines.
  - Cyclomatic Complexity: Max 10.
- **Rules**:
  - No `console.log` in production (Use Logger).
  - No commented-out code (Delete it).
  - No Unused Imports (Lint error).
  - No "Magic Numbers" (Use constants).

---

---

## 6. Code Structure Rules

- **Ordering**:
  1.  Imports (Third-party -> Internal -> Styles)
  2.  Constants / Types
  3.  Component / Class / Function
  4.  Sub-functions (Helper functions local to the file)
  5.  Exports
- **Visibility**: Explicit `public`/`private`/`protected` on classes.
- **State**: Immutable by default (`const` > `let`). No global state variables.
- **Single Responsibility**: One function does one thing "well". Max 3 arguments.

### File Ordering Standard

```typescript
/* 1. External Imports */
import { useState } from 'react';
import { z } from 'zod';
/* 2. Internal Imports */
import { User } from '@core/types';
import { Button } from '@ui/Button';
/* 3. Constants/Types */
const MAX_COUNT = 10;
type Props = { id: string };
/* 4. Main Component/Function */
export const UserProfile = ({ id }: Props) => {
/* ... */
};
/* 5. Helpers (not exported) */
const formatName = (name: string) => { ... };
```

---

## 7. Types, Interfaces & Models

- **Strict Mode**: `strict: true` in `tsconfig.json` is mandatory.
- **No `any`**: Use `unknown` or specific types. `any` requires `// eslint-disable-next-line` with justification.
- **Nullable**: Explicit `string | null`. Avoid `undefined` for data fields (JSON compat).
- **Domain Models vs DTOs**:
  - `UserDTO`: Over the wire (JSON). Contains string dates `created_at`.
  - `User`: Internal domain logic. Contains Date objects `createdAt`.
  - **Conversion**: Always validate and transform at the boundary (Controller/Client).
- **Validation**: Validate all inputs at the "Edge" (Zod / Joi). Trust nothing.

### Serialization Rules

- **Date Handling**: ISO 8601 strings (`2024-01-01T12:00:00Z`) for API.
- **BigInt**: Convert to string for JSON.
- **Secrets**: Exclude from default JSON serialization (`toJSON()` method).

---

## 8. Comments & Documentation

- **The "Why"**: Comments explain _why_ something is done, not _what_ (code explains what).
- **Public API**: Function signatures exported from module MUST have JSDoc (`@param`, `@returns`).
- **Code Examples**: Complex utility functions must include `@example`.

### Special Tags

- `// TODO(username): High priority tech debt`
- `// FIXME: Known bug, needs fix`
- `// HACK: Temporary workaround (explain why)`
- `// NOTE: Important context`

### Deprecation Policy

```typescript
/**
 * @deprecated Use `newFunction` instead.
 * @reason Performance issues with large arrays.
 * @removeBy v2.0.0
 */
```

---

## 12. Error Handling

> See [09_ERROR_HANDLING.md](./09_ERROR_HANDLING.md) for full details.

- **Exceptions**: Use Custom Errors (`AppError`, `NetworkError`).
- **Messages**:
  - Log: "Database connection failed at 10.0.0.5: Timeout" (Internal)
  - User: "Service temporarily unavailable. Try again." (Safe)
- **Async**: Always handle Promise rejections (`try/catch` or `.catch()`). No unhandled rejections allowed.

---

## 13. Logging

> See [09_ERROR_HANDLING.md](./09_ERROR_HANDLING.md) for full details.

- **Format**: JSON structured logging only (Pino / Winston).
- **No PII**: Never log passwords, tokens, or PII (Redact active).
- **Correlation**: Every log must have `trace_id` propagated across services.
