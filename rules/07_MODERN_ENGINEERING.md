# 07. Modern Engineering & Workflows

## 30. Developer Experience (DX)

> "A slow loop kills flow."

- **Onboarding**: `npm run setup` must bootstrap the entire environment (DB, Redis, Deps) in < 5 mins.
- **Environment**:
  - `.env.example` must work out-of-the-box.
  - `docker-compose.yml` encompasses ALL infrastructure.
- **IDE Configuration**:
  - Commited `.vscode/settings.json` and `.vscode/extensions.json`.
  - Recommended Extensions: ESLint, Prettier, Prisma, Tailwind.
- **Pre-Commit Hooks** (Husky):
  - Prettier (Staged files).
  - `tsc --noEmit` (Type check).
  - `gitleaks` (Secret check).
- **Feedback Loops**:
  - Typecheck: < 2s.
  - Unit Test Watch Mode: < 1s.
  - Hot Reload: < 100ms.

---

## 37. AI & Automation

- **Code Review**: AI Bots (e.g., CodeRabbit) used for first-pass linting/trivial comments.
- **Assistance**: Copilot/Ghostwriter allowed but Output **MUST** be reviewed.
- **Refactoring**: Automated migration scripts (codemods) preferred over manual repetitive changes.
- **Test Gen**: AI used to generate boilerplate test cases (Edge cases/Inputs), but Logic verified by human.

---

## 31. Collaboration (Async & Remote)

- **Communication**: "Write it down > Say it out loud".
- **Meetings**: Record all technical decision meetings.
- **PRs**:
  - Use `Draft` status for "WIP - Feedback requested".
  - Use `Ready` status for "Final Review".
- **Etiquette**: Assume positive intent. Text lacks tone.

---

## 00. The Golden Rule

> Leave the code better than you found it.
