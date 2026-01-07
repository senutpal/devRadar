# 04. Architecture & Design

---

## 9. Architecture Patterns

### Hexagonal / Clean Architecture

Preferred for core business logic to ensure independence from frameworks and tools.

- **Domain Layer** (Inner): Pure business logic. No external dependencies.
  - Entities: `User`, `Presence`
  - Ports (Interfaces): `UserRepository`, `PresenceNotifier`
- **Application Layer**: Orchestrators. Use Cases.
  - `UpdatePresenceUseCase`, `GetUserStatsUseCase`
- **Adapters Layer** (Outer): Implementations.
  - Primary Adapters (Drivers): `FastifyController`, `WebSocketHandler`
  - Secondary Adapters (Driven): `PostgresUserRepository`, `RedisPresenceNotifier`

### Event-Driven Patterns

**DevRadar** is heavily event-driven due to its real-time nature.

- **Internal Events**: Node.js `EventEmitter` for decoupling within a service.
- **Domain Events**: Events that signify a business state change.
  - `UserConnected`, `PresenceUpdated`, `MergeConflictDetected`
- **Event Bus**: Redis Pub/Sub for cross-service communication.

### Cross-Service Communication

| Pattern                          | Use Case                            | Tech                   |
| -------------------------------- | ----------------------------------- | ---------------------- |
| **Sync (Request/Response)**      | Critical data fetch, Authentication | HTTP / REST            |
| **Async (Fire & Forget)**        | Analytics, Logging, Notifications   | Message Queue / PubSub |
| **Async (Eventual Consistency)** | Replicating data to search index    | Message Queue          |

---

## 10. Architecture Decision Records (ADR)

> **Rule**: If it changes how we build, document it.

- **Trigger**: Any decision that affects multiple components or has long-term impact.
- **Location**: `/docs/adr/001-title-slug.md`
- **Template**: [Use the ADR Template](./TEMPLATES/ADR_TEMPLATE.md)
- **Process**:
  1.  Draft ADR.
  2.  Review with ARB.
  3.  Commit as `Decision: Accepted` or `Decision: Rejected`.
  4.  Implement.
- **Immutability**: Once accepted, do not edit. Create a new ADR to supersede.

---

## 11. API Design

- **Format**: REST standard (Resource-oriented).
  - POST `/users` (Create)
  - GET `/users/:id` (Read)
- **Versioning**: `/v1/resource` in URL.
- **Response**: Standard envelope:
  ```json
  { "data": {}, "meta": { "page": 1 }, "error": null }
  ```
- **Sort/Filter**: `?sort=-created_at&status=active`
- **Auth**: Bearer Token in Header.
- **Rate Limit**: 429 status code with `Retry-After` header.

---

## 18. Configuration Management

- **12-Factor**: Config stored in Environment Variables.
- **Secrets**: Never commit `.env`. Use `.env.example`.
- **Rotation**: Database credentials rotated every 90 days.
- **Feature Flags**: Use LaunchDarkly (or similar internal tool) for enabling features without deploy.

---

## 19. Data Management

- **Migrations**: Database schema changes must be versioned (`flyway` / `prisma migrate`).
  - Up/Down scripts required.
- **Retention**: User activity logs retained 90 days then cold storage.
- **Backups**: Daily snapshots. Point-in-time recovery enabled.
- **Encryption**: AES-256 at rest (Disk). TLS 1.3 in transit.

---

## 36. Scalability & Resilience

- **Horizontal**: Stateless services. Add replicas to scale.
- **Bulkheading**: Isolation. If "Chat" service dies, "Login" must not fail.
- **Circuit Breakers**: Stop calling failing downstream services to prevent cascading failure.
- **Chaos**: Regularly test resilience (e.g., kill random pod in staging).
