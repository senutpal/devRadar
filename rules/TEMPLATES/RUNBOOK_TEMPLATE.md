# Runbook: [Alert/Scenario Name]

## Metadata

| Field            | Value                          |
| ---------------- | ------------------------------ |
| **Document ID**  | RB-XXX                         |
| **Alert Name**   | [PagerDuty/Grafana alert name] |
| **Service**      | [affected service]             |
| **Severity**     | SEV-1 / SEV-2 / SEV-3          |
| **Owner**        | @team-name                     |
| **Last Updated** | YYYY-MM-DD                     |
| **Last Tested**  | YYYY-MM-DD                     |

---

## Overview

### Description

[Brief description of what this runbook addresses. What situation triggers this runbook?]

### When to Use This Runbook

- [Trigger condition 1]
- [Trigger condition 2]

### Expected Duration

[How long should resolution typically take?]

---

## Symptoms

### Alerts

- [ ] `alert_name_1` (Grafana/PagerDuty)
- [ ] `alert_name_2`

### User-Reported Issues

- [What users will report: e.g., "Can't see friends online"]

### Observable Symptoms

- [Symptom 1: e.g., Error rate spike in dashboard]
- [Symptom 2: e.g., Increased latency]

### Affected Dashboards

- [Link to Grafana dashboard 1]
- [Link to Grafana dashboard 2]

---

## Impact Assessment

### User Impact

[Describe how this issue affects end users]

### Business Impact

[Describe revenue/reputation impact if any]

### Blast Radius

[Which systems/services are affected?]

---

## Quick Diagnosis

### Step 1: Verify the Alert

```bash
# Command to check if the alert is real or a false positive
[diagnostic command]
```

**Expected output**: [What you should see if the issue is confirmed]

### Step 2: Check Related Metrics

```bash
# Command to gather context
[diagnostic command]
```

**Look for**: [What patterns indicate the root cause]

### Step 3: Review Recent Changes

```bash
# Check recent deployments
git log --oneline -10

# Check feature flag changes
[command to check feature flags]
```

---

## Remediation

> ⚠️ **IMPORTANT**: Try steps in order. Stop at the first one that works.

### Option A: [First remediation approach]

**When to use**: [Condition when this approach is appropriate]

**Steps**:

1. [Step 1]
   ```bash
   [command]
   ```
2. [Step 2]
   ```bash
   [command]
   ```
3. **Verify**:
   ```bash
   [verification command]
   ```

**Expected Result**: [What success looks like]

---

### Option B: [Second remediation approach]

**When to use**: [Condition when this approach is appropriate]

**Steps**:

1. [Step 1]
2. [Step 2]

---

### Option C: Rollback

**When to use**: If Options A and B fail, or if issue started after a deployment

**Steps**:

1. Identify last known good version
   ```bash
   [command to check versions]
   ```
2. Initiate rollback
   ```bash
   [rollback command]
   ```
3. Monitor for recovery
   ```bash
   [monitoring command]
   ```

---

## Verification

### Confirm Resolution

- [ ] Alert has cleared
- [ ] Error rate returned to baseline
- [ ] User reports have stopped
- [ ] Smoke test passed:
  ```bash
  [smoke test command]
  ```

### Document Actions Taken

Record in incident channel:

- What was the root cause?
- What remediation step worked?
- Any follow-up actions needed?

---

## Escalation

### When to Escalate

- [ ] Remediation steps not working after [X] minutes
- [ ] Issue is beyond your expertise
- [ ] Customer/revenue impact is confirmed
- [ ] Security implications suspected

### Escalation Path

1. **Secondary On-Call**: @secondary-oncall
2. **Tech Lead**: @tech-lead
3. **Incident Commander** (SEV-1 only): @incident-commander

### Contact Information

| Role             | Contact |
| ---------------- | ------- |
| Redis Expert     | @person |
| WebSocket Expert | @person |
| Database Expert  | @person |

---

## Prevention

### Root Cause Categories

[After using this runbook, identify which category the root cause falls into:]

- [ ] Capacity/scaling issue
- [ ] Configuration error
- [ ] Bug in code
- [ ] External dependency failure
- [ ] Human error

### Long-Term Fixes

| Fix                    | Owner   | Ticket   |
| ---------------------- | ------- | -------- |
| [Preventive measure 1] | @person | JIRA-XXX |
| [Preventive measure 2] | @person | JIRA-XXX |

---

## Appendix

### Related Runbooks

- [RB-XXX: Related runbook 1]
- [RB-XXX: Related runbook 2]

### Reference Links

- [Architecture diagram]
- [Service documentation]
- [Relevant ADRs]

### Glossary

| Term     | Definition   |
| -------- | ------------ |
| [Term 1] | [Definition] |
| [Term 2] | [Definition] |

---

## Changelog

| Date       | Author  | Change                        |
| ---------- | ------- | ----------------------------- |
| YYYY-MM-DD | @author | Initial version               |
| YYYY-MM-DD | @author | Added Option C after incident |
