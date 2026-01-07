# 05. Quality & Observability

## 15. Testing Standards

### The Test Pyramid

1.  **Unit Tests** (70%): Fast, isolated. Jest/Vitest. Mock external deps.
2.  **Integration Tests** (20%): Database/API interactions. TestContainers.
3.  **E2E Tests** (10%): Full user flows. Playwright/Cypress.

### Contract Testing

- **Tool**: Pact (or OpenAPI diff).
- **Goal**: Ensure API provider (Backend) and consumer (Frontend/Extension) agree on the schema.
- **Process**:
  1.  Consumer defines expectations (Contract).
  2.  Provider runs tests against Contract.
  3.  Breakage = Build Failure.

### Property-Based Testing

- **Tool**: `fast-check`.
- **Goal**: Find edge cases by generating random inputs.
- **Use Case**: Complex algorithms (e.g., Conflict Radar logic).

### Test Data Management

- **Factories**: Use `faker.js` + factory pattern. Avoid hardcoded fixtures.
- **Isolation**: Each test suite runs in a transaction (rolls back at end) OR uses a unique seed.
- **Cleanup**: Tests must clean up their own mess (Redis keys, S3 files).

---

## 29. Quality Assurance

- **Quality Gates**:
  - Unit Tests must pass.
  - Linting must pass (0 warnings).
  - Coverage > 80% (New code).
  - No blocked vulnerabilities.
- **Release Checklist**:
  - [ ] Manual "Smoke Test" of critical paths (Login, WebSocket Connect).
  - [ ] Visual regression check (Storybook).
  - [ ] Database migration dry-run.
- **Exploratory Testing**: 30m "Bug Bash" sessions by non-authors before major releases.

---

## 16. Performance

- **Budgets**:
  - API Response: < 200ms (P95).
  - Web Vitals (LCP): < 2.5s.
- **Testing**: Load test (k6) before launch. Stress test to breaking point.
- **Caching**:
  - Browser (Headers).
  - CDN (Static assets).
  - Redis (Hot data).
  - Application (Memoization).

---

## 14. Observability

### Metrics

- **RED Method**: Rate (Req/s), Errors (%), Duration (ms).
- **SLIs/SLOs**:
  - SLI: "99.5% of requests succeed".
  - SLO: Target we promise.
  - SLA: Contractual penalty (External).

### Tracing

- **Distributed Tracing**: OpenTelemetry mandatory. Pass `traceparent` headers.
- **Dashboards**: Grafana standard panels (USE Method - Utilization, Saturation, Errors).

---

## 35. Metrics & Engineering Health

### DORA Metrics (Elite Target)

1.  **Deployment Frequency**: On-demand (Multiple per day).
2.  **Lead Time for Change**: < 1 hour (Commit to Deploy).
3.  **MTTR (Recovery)**: < 1 hour.
4.  **Change Failure Rate**: < 5%.
