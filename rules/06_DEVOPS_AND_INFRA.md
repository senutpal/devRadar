# 06. DevOps & Infrastructure

## 21. Build System

- **Deterministic**: Builds must produce identical bitwise output for same commit.
- **Caching**: TurboRepo Remote Caching enabled.
- **Artifacts**: Versioned `dev-radar-api-v1.2.3.tar.gz`. never overwrite.
- **Multi-platform**: Build for `linux/amd64` and `linux/arm64`.

---

## 22. CI/CD Pipeline

### Stages

1.  **Validation**: Lint, Typecheck, Prettier.
2.  **Test**: Unit + Integration.
3.  **Security**: Vulnerability Scan (Trivy), Secret Scan.
4.  **Build**: Docker Image build + Push.
5.  **Deploy**: Terraform apply (Staging -> Prod).

---

---

## 23. Deployment

- **Strategy**:
  - **Staging**: Continuous Deployment (Main branch).
  - **Production**: Blue/Green (Switch traffic) or Canary (Gradual).
- **Blue/Green Process**:
  1.  Deploy v2 to idle stack (Green).
  2.  Run smoke tests against Green.
  3.  Switch Load Balancer to Green.
  4.  Wait 1 hour.
  5.  Teardown Blue.
- **Canary Process**:
  1.  Deploy v2 to 5% of users.
  2.  Monitor Error Rate & Latency.
  3.  Auto-promote to 20% -> 50% -> 100%.
- **Manual Approval Gates**: Required for Production promotion.

### Rollback Strategy

- **Auto-Rollback**: If Error Rate > 2% within 5m of deploy.
- **Manual Rollback**: "One-Click" revert in CI/CD dashboard.
- **Database**: Down-migrations are dangerous. Prefer "Fix Forward" for DB issues unless catastrophic.

---

## 25. Infrastructure

- **IaC**: HashiCorp Terraform / OpenTofu. State stored in S3 with Locking (DynamoDB).
- **Resource Naming**:
  - Pattern: `[env]-[region]-[service]-[resource]`
  - Example: `prod-us-east-1-devradar-api-rds`
- **DNS Standards**:
  - External: `api.devradar.io`
  - Internal: `api.prod.local`
- **Cost Monitoring**:
  - Tag: `Owner=TeamName`, `Env=Production`.
  - Alert: Budget spike > 20% week-over-week.

---

## 26. Containers & Orchestration

- **Base Images**: Use Distroless or Alpine (Minimal attack surface).
- **Security**: Non-root user in Dockerfile. Read-only filesystem.
- **Quotas**: Max Request/Limit defined for all Pods.
- **Scan**: Daily scan of registry images.

---

## 28. Operations & Runbooks

- **Runbooks**: "If Alert X fires, do Y". stored in repo `/ops/runbooks`.
- **Scenarios**:
  - "Database CPU High"
  - "Redis Memory Full"
  - "Certificate Expired"
