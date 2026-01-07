# 08. Security Framework

> **Priority**: CRITICAL. DevRadar handles real-time user activity data. Security is non-negotiable.

---

## 17. Security Standards

### Secure Coding Principles

1.  **Defense in Depth**: Multiple layers of security controls.
2.  **Least Privilege**: Grant minimum permissions required.
3.  **Fail Secure**: Default to deny access on errors.
4.  **Zero Trust**: Verify every request, even internal.

---

### Input Validation

- **Boundary Validation**: Validate ALL external inputs at system edges.
- **Schema Validation**: Use `Zod` for TypeScript runtime validation.
- **Reject Unknown**: Deny any fields not explicitly defined (`strict()` mode).
- **Size Limits**: Enforce max payload sizes (e.g., 1MB for heartbeats).

```typescript
/* Example: Heartbeat payload validation */
const HeartbeatSchema = z
  .object({
    userId: z.string().uuid(),
    status: z.enum(['online', 'idle', 'dnd', 'invisible']),
    currentFile: z.string().max(255).optional(),
    language: z.string().max(50).optional(),
    project: z.string().max(100).optional(),
    timestamp: z.number().int().positive(),
  })
  .strict();
```

---

### Output Encoding

- **HTML**: Escape all user-generated content before rendering.
- **JSON**: Use native `JSON.stringify()` - never string concatenation.
- **SQL**: Use parameterized queries ONLY. Never interpolate.
- **URLs**: Encode special characters with `encodeURIComponent()`.

---

### Authentication Standards

- **Protocol**: OAuth 2.0 with PKCE for VS Code extension.
- **Providers**: GitHub OAuth primary. Email/Password backup.
- **Tokens**:
  - Access Token TTL: 15 minutes.
  - Refresh Token TTL: 7 days.
  - Rotate refresh tokens on use (one-time use).
- **Session**: Bind sessions to user-agent fingerprint.
- **MFA**: Required for Team/Enterprise tier admins.

---

### Authorization Standards

- **Model**: Role-Based Access Control (RBAC).
- **Roles**:
  | Role | Permissions |
  |------|-------------|
  | `user` | Own profile, friend requests, presence |
  | `pro` | User + Ghost Mode, Custom Status |
  | `team_member` | Pro + Team view, Conflict Radar |
  | `team_admin` | Member + User management, Reports |
  | `superadmin` | Full system access |
- **Enforcement**: Check permissions at API gateway AND service layer.
- **Audit**: Log all permission denials.

---

### Secrets Management

- **Storage**: HashiCorp Vault or Doppler. NEVER in code/config files.
- **Rotation**:
  - Database credentials: Every 90 days.
  - API keys: Every 180 days.
  - JWT signing keys: Every 30 days.
- **Access**: Secrets injected at runtime via environment variables.
- **Commit Prevention**: Pre-commit hooks with `gitleaks` or `trufflehog`.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

### Dependency Security

- **Scanning**: `npm audit` runs on every build. Block on High/Critical.
- **Automated**: Dependabot/Renovate for automated security patches.
- **SBOM**: Generate Software Bill of Materials for compliance.
- **Review**: New dependencies require Security Lead approval.

---

### Static Security Analysis

- **Tool**: CodeQL (GitHub Advanced Security) or Semgrep.
- **Coverage**: Scan on every PR.
- **Blocking**: Critical findings block merge.
- **False Positives**: Document in `.codeql/` with justification.

---

### Penetration Testing

- **Frequency**: Annual third-party pentest (minimum).
- **Scope**: Full API surface, WebSocket handlers, OAuth flows.
- **Remediation**: Critical findings fixed within 72 hours.
- **Retesting**: Verify fixes before closing findings.

---

### Threat Modeling (STRIDE)

Perform threat modeling for new features using STRIDE:

| Threat                     | Description                   | DevRadar Example                    |
| -------------------------- | ----------------------------- | ----------------------------------- |
| **S**poofing               | Pretending to be another user | Fake heartbeats with stolen userId  |
| **T**ampering              | Modifying data                | Manipulating leaderboard stats      |
| **R**epudiation            | Denying actions               | Denying sent "pokes"                |
| **I**nformation Disclosure | Exposing private data         | Leaking file paths of private repos |
| **D**enial of Service      | Overloading system            | Flooding WebSocket with heartbeats  |
| **E**levation of Privilege | Gaining unauthorized access   | Free user accessing Team features   |

---

### Rate Limiting

- **Heartbeats**: Max 2 per minute per user.
- **Friend Requests**: Max 20 per hour.
- **API Calls**: 1000/hour (Free), 10000/hour (Pro/Team).
- **Response**: Return `429 Too Many Requests` with `Retry-After` header.

---

### WebSocket Security

- **Authentication**: Validate JWT on connection handshake.
- **Ping/Pong**: 30-second heartbeat to detect stale connections.
- **Message Validation**: Validate every incoming message against schema.
- **Disconnect**: Auto-disconnect after 60 seconds of silence.

---

### Privacy-First Design (DevRadar Specific)

> **CRITICAL**: DevRadar's #1 risk is the "creepiness factor."

- **NEVER** send actual code content to servers.
- **NEVER** track specific keystrokes.
- **Hash** file paths for Conflict Radar (reveal filename only if user opts in).
- **Blacklist**: Users can exclude files from broadcast (`*.env`, `*secret*`).
- **Incognito Mode**: One-click toggle to pause all broadcasting.
- **Data Minimization**: Only collect what's necessary for the feature.

```typescript
/* File path privacy - hash by default */
const hashFilePath = (path: string): string => {
  return crypto.createHash('sha256').update(path).digest('hex').slice(0, 16);
};
/* Only reveal if user explicitly enables */
const getDisplayPath = (path: string, privacyLevel: 'hash' | 'filename' | 'full'): string => {
  switch (privacyLevel) {
    case 'hash':
      return hashFilePath(path);
    case 'filename':
      return path.split('/').pop() ?? 'unknown';
    case 'full':
      return path;
  }
};
```

---

### Security Review Checklist

Before launching any feature, verify:

- [ ] All inputs validated at boundary
- [ ] Authentication required for protected endpoints
- [ ] Authorization checked for resource access
- [ ] No secrets in code or logs
- [ ] Rate limiting configured
- [ ] Error messages don't leak internal details
- [ ] Threat model reviewed
- [ ] Security Lead sign-off

---

## Security Incident Response

See [11_INCIDENT_MANAGEMENT.md](./11_INCIDENT_MANAGEMENT.md) for incident handling procedures.

**Security-Specific Contacts**:

- **Security Lead**: security@devradar.io
- **Vulnerability Reports**: security@devradar.io (PGP key available)
- **Bug Bounty**: Coming soon (Post-MVP)
