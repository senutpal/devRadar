# 01. Organization & Governance

## 1. Organization & Governance

### Engineering Principles

1.  **User First**: Every line of code must deliver value to the user.
2.  **Ship It**: Perfect is the enemy of good. Velocity matters.
3.  **Clean is Better than Clever**: Write code for humans, not compilers.
4.  **You Build It, You Run It**: Teams own the full lifecycle of their services.

---

## 1. Governance & Leadership

### Architecture Review Board (ARB)

**Charter**: Ensure long-term technical health, scalability, and pattern compliance.

- **Composition**: Principal Engineer (Chair), Staff Engineers, Security Lead, Product Architect.
- **Triggers**:
  - New Microservice / Service boundary change.
  - New Data Store technology.
  - Breaking API changes.
  - Security architecture changes.
- **Process**:
  1. Submit [ADR](../docs/adr/README.md) proposal.
  2. Async review (48h).
  3. Presentation meeting (if contested).
  4. Consensus decision (Approved / Changes Requested / Rejected).
- **VETO Power**: The ARB can veto any technical decision that violates core principles or introduces unacceptable risk.

### Coding Standards Committee

**Charter**: Maintain excellent DX and code quality standards.

- **Composition**: Rotating Chair (Monthly), representatives from Frontend, Backend, and Platform teams.
- **Responsibility**:
  - Review linting rules and formatter configs.
  - Standardize testing patterns.
  - Manage "Bikeshedding" disputes (escalate to vote).
  - Monthly `CODING_STANDARDS.md` review.

### Decision Escalation Matrix

| Level  | Role                       | Scope                                                           | Time to Decide |
| ------ | -------------------------- | --------------------------------------------------------------- | -------------- |
| **L1** | **Individual Contributor** | Implementation details, variable naming, local refactoring      | Immediate      |
| **L2** | **Tech Lead / Code Owner** | Component design, PR approval, minor dependency adds            | < 24h          |
| **L3** | **Staff / Principal Eng**  | Cross-component API, major dependency changes, data schema      | < 48h          |
| **L4** | **Architecture Board**     | System architecture, new technology stack, security model       | < 1 week       |
| **L5** | **CTO / VP Eng**           | Budget impact greater than $1k/mo, Legal/Compliance risk, Pivot | < 2 weeks      |

> **Rule**: If a decision is stuck at a level for longer than the "Time to Decide", it automatically escalates to the next level.

---

## 32. Knowledge Management

- **Wiki (internal)**: The single source of truth for "How-To", "Onboarding", and "Processes".
- **Documentation Freshness**:
  - Every doc page must have an `owner` and `last_updated`.
  - **Stale Bot**: Flags docs > 6 months old. Owner has 2 weeks to verify or archive.
- **Searchability**:
  - Use standardized tags in frontmatter: `tags: [setup, local-env, trouble-shooting]`.
  - No PDF/Word docs. Markdown only (searchable via grep/IDE).
- **Code vs Docs**:
  - **Code**: Explains "How" (implementation).
  - **Commit/PR**: Explains "Why" (context).
  - **Docs**: Explains "What" (architecture/system).

---

## 40. Continuous Improvement (Kaizen)

### Technical Debt Management

**Definition**: Deliberate shortcuts taken to ship faster, with the obligation to fix later.

**Tracking Process**:

1. **Identify**: Create JIRA ticket with label `tech-debt`.
2. **Quantify**: Estimate "Interest Rate" (Impact on velocity/stability).
   - _High Interest_: Slows down every deploy.
   - _Low Interest_: Ugly code but isolated.
3. **Repayment**:
   - **Boy Scout Rule**: Leave code better than you found it (micro-refactors).
   - **Debt Sprint**: Every 4th sprint is 100% focused on Tech Debt & Infrastructure.
   - **Debt Cap**: If `tech-debt` tickets > 20% of backlog, **Feature freeze** until reduced to 10%.

### Retrospectives

- **Cadence**: Every 2 weeks (post-sprint).
- **Format**: Start / Stop / Continue.
- **Output**: 3 concrete Action Items with Owners.
- **Safety**: "What happens in Vegas stays in Vegas" (unless it's an HR issue). psychological safety is paramount.

### Experimentation Framework

1. **Hypothesis**: "If we implement X, metric Y will improve by Z%."
2. **MVP**: Build minimum viable feature.
3. **Measure**: A/B test or rollout.
4. **Learn**: Document results. Pivot or Persevere.
