# 11. Incident Management & Runbooks

> **Principle**: Incidents happen. Our response defines us. Be fast, be thorough, be blameless.

---

## 27. Incident Severity Levels

### Severity Definitions

| Severity  | Name     | Description                               | Response Time     | Example                               |
| --------- | -------- | ----------------------------------------- | ----------------- | ------------------------------------- |
| **SEV-0** | Critical | Total system outage, data loss risk       | Immediate (5 min) | Database corruption, Auth system down |
| **SEV-1** | High     | Major feature broken, 50%+ users affected | 15 minutes        | WebSocket server unreachable          |
| **SEV-2** | Medium   | Feature degraded, workaround exists       | 1 hour            | Leaderboards not updating             |
| **SEV-3** | Low      | Minor impact, cosmetic issues             | 24 hours          | Avatar images loading slowly          |

### Impact Matrix

| Factor         | SEV-0       | SEV-1     | SEV-2     | SEV-3 |
| -------------- | ----------- | --------- | --------- | ----- |
| Users affected | >50%        | 20-50%    | 5-20%     | <5%   |
| Revenue impact | Yes         | Possible  | No        | No    |
| Data loss      | Risk exists | No        | No        | No    |
| Workaround     | None        | Difficult | Available | Easy  |

---

## Incident Response Process

### The OODA Loop

```
OBSERVE → ORIENT → DECIDE → ACT → (repeat)
```

### Step-by-Step Response

#### 1. Detection & Alert (Automated)

```yaml
# PagerDuty alert routing
alerts:
  - name: 'WebSocket Connections Down'
    condition: ws_connections < 100 for 2m
    severity: SEV-1
    route: on-call-primary

  - name: 'Redis Memory >90%'
    condition: redis_memory_usage > 0.9
    severity: SEV-2
    route: on-call-primary
```

#### 2. Acknowledgment

- **SEV-0/1**: Ack within 5 minutes.
- **SEV-2/3**: Ack within 30 minutes.
- **No Ack**: Auto-escalate to secondary on-call.

#### 3. Triage & Classify

```markdown
Quick Questions:

1. What is broken?
2. Who is affected?
3. When did it start?
4. Is it still happening?
5. What changed recently?
```

#### 4. Communicate

```markdown
# Status Page Update Template

**[SEV-X] [Component] - [Brief Description]**

**Status**: Investigating | Identified | Monitoring | Resolved
**Impact**: [User-facing impact description]
**Started**: 2024-01-01 12:00 UTC
**Last Update**: [Timestamp]
**Next Update**: [ETA for next update]
```

#### 5. Stabilize (Fix vs Rollback)

```
Prefer ROLLBACK over FIX FORWARD:
├── Rollback: Revert to last known good state (fast, low risk)
├── Feature Flag: Disable problematic feature (fast, surgical)
└── Fix Forward: Deploy fix (slow, risky - last resort)
```

#### 6. Investigate (Root Cause)

- Gather logs, metrics, traces.
- Use correlation IDs to trace requests.
- Interview recent deployers.
- Timeline reconstruction.

#### 7. Postmortem (Blameless)

- **When**: Within 48 hours of resolution.
- **Who**: Incident Commander + involved engineers.
- **Format**: See [Postmortem Template](#postmortem-template).

---

## On-Call Rotation

### Structure

```
Primary On-Call (L1)
    ↓ (escalate after 15 min)
Secondary On-Call (L2)
    ↓ (escalate for SEV-0 or after 30 min)
Tech Lead (L3)
    ↓ (escalate for business/PR impact)
VP Engineering (L4)
```

### Responsibilities

| Role                   | Duties                                  |
| ---------------------- | --------------------------------------- |
| **Primary**            | Ack alerts, initial triage, minor fixes |
| **Secondary**          | Backup, pair on complex issues          |
| **Incident Commander** | Coordinate response (SEV-0/1 only)      |
| **Scribe**             | Document timeline, actions taken        |
| **Comms Lead**         | Status page, stakeholder updates        |

### On-Call Etiquette

- Handoff meetings at rotation boundary.
- Document everything in incident channel.
- No shame in escalating early.
- Post-shift mental health check-in.

---

## Communication Templates

### Slack Incident Channel Creation

```
/incident create SEV-1 "WebSocket servers unreachable"
# Creates: #incident-2024-01-01-websocket-down
# Invites: on-call, SRE team
# Posts: initial summary
```

### Status Page Templates

**Investigating**:

> We are currently investigating issues with [Component]. Some users may experience [symptom]. We will provide an update within [timeframe].

**Identified**:

> We have identified the cause of [Component] issues. [Brief explanation without technical details]. We are implementing a fix and expect resolution by [ETA].

**Monitoring**:

> A fix has been implemented for [Component]. We are monitoring the situation to ensure stability. We apologize for any inconvenience.

**Resolved**:

> The issue affecting [Component] has been fully resolved. [Optional: brief postmortem summary]. Thank you for your patience.

---

## 28. Runbooks

### Runbook Template

```markdown
# Runbook: [Alert Name]

## Symptoms

- [Observable symptom 1]
- [Observable symptom 2]

## Impact

- [User-facing impact]

## Quick Diagnosis

1. Check dashboard: [Link]
2. Run command: `[diagnostic command]`
3. Look for: [what to look for]

## Remediation Steps

1. [First action]
2. [Second action]
3. [Verification step]

## Escalation

- If [condition], escalate to [team/person]

## Prevention

- [How to prevent recurrence]
```

---

### Runbook: Redis Memory Full

#### Symptoms

- Alert: `redis_memory_usage > 90%`
- User reports: Status not updating, friends showing offline

#### Quick Diagnosis

```bash
# Check memory usage
redis-cli INFO memory | grep used_memory_human

# Find largest keys
redis-cli --bigkeys

# Check TTL of presence keys
redis-cli DEBUG OBJECT "presence:user:*"
```

#### Remediation

1.  **Immediate**: Flush stale presence keys
    ```bash
    redis-cli SCAN 0 MATCH "presence:*" COUNT 1000 | xargs redis-cli DEL
    ```
2.  **If persistent**: Scale Redis vertically (increase memory)
3.  **If recurring**: Review key TTL settings

#### Prevention

- Ensure all presence keys have TTL set (60s max)
- Set up memory eviction policy: `allkeys-lru`

---

### Runbook: WebSocket Server Overload

#### Symptoms

- Alert: `ws_connection_errors > 100/min`
- User reports: "Connection lost" messages

#### Quick Diagnosis

```bash
# Check connection count
curl http://localhost:3000/healthz | jq '.websocket_connections'

# Check CPU/Memory
docker stats devradar-ws

# Check for connection storms
tail -f /var/log/devradar/ws.log | grep "connection_opened"
```

#### Remediation

1.  **Immediate**: Enable rate limiting on new connections
    ```bash
    curl -X POST http://localhost:3000/admin/ratelimit -d '{"newConnections": 50}'
    ```
2.  **If attack**: Block offending IPs at load balancer
3.  **If organic growth**: Scale horizontally (add WS server)

---

### Runbook: Database Connection Pool Exhausted

#### Symptoms

- Alert: `db_pool_exhausted`
- Error logs: `connection pool timeout`

#### Quick Diagnosis

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Find long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;
```

#### Remediation

1.  **Immediate**: Kill long-running queries
    ```sql
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity
    WHERE duration > interval '5 minutes';
    ```
2.  **Short-term**: Increase pool size (requires restart)
3.  **Long-term**: Optimize slow queries, add indexes

---

### Runbook: OAuth Provider Down

#### Symptoms

- Alert: `github_oauth_errors > 10/min`
- User reports: "Login not working"

#### Quick Diagnosis

```bash
# Check GitHub status
curl https://www.githubstatus.com/api/v2/status.json | jq '.status'

# Check our OAuth callback logs
grep "oauth_callback" /var/log/devradar/auth.log | tail -20
```

#### Remediation

1.  **If GitHub is down**: Nothing we can do. Update status page.
2.  **If our side**: Check OAuth credentials, callback URLs
3.  **Mitigation**: Allow existing sessions to continue (don't force re-auth)

---

## Postmortem Template

```markdown
# Incident Postmortem: [Title]

## Summary

| Field              | Value             |
| ------------------ | ----------------- |
| Date               | YYYY-MM-DD        |
| Duration           | X hours Y minutes |
| Severity           | SEV-X             |
| Author             | [Name]            |
| Incident Commander | [Name]            |

## Impact

- [x] users affected
- [Y] minutes of downtime
- [Revenue impact if any]

## Timeline (All times UTC)

| Time  | Event                     |
| ----- | ------------------------- |
| 12:00 | Alert fired: [alert name] |
| 12:05 | On-call acknowledged      |
| 12:15 | Root cause identified     |
| 12:30 | Fix deployed              |
| 12:45 | Incident resolved         |

## Root Cause

[Detailed technical explanation of what went wrong]

## What Went Well

- [Positive aspect of response]

## What Went Poorly

- [Negative aspect of response]

## Action Items

| Action     | Owner  | Due Date   | Ticket     |
| ---------- | ------ | ---------- | ---------- |
| [Action 1] | [Name] | YYYY-MM-DD | [JIRA-123] |

## Lessons Learned

[Key takeaways for the team]

## 5 Whys Analysis

1. Why did [symptom] happen?
   → Because [cause 1]
2. Why did [cause 1] happen?
   → Because [cause 2]
   ...
```

---

## Incident Metrics

### Tracking KPIs

| Metric          | Target   | Description              |
| --------------- | -------- | ------------------------ |
| MTTA            | < 5 min  | Mean Time to Acknowledge |
| MTTD            | < 15 min | Mean Time to Diagnose    |
| MTTR            | < 1 hour | Mean Time to Resolve     |
| Incidents/Week  | < 2      | Incident frequency       |
| Postmortem Rate | 100%     | SEV-0/1 get postmortems  |
