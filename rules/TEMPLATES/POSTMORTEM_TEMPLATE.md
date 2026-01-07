# Incident Postmortem: [Incident Title]

## Summary

| Field                      | Value                       |
| -------------------------- | --------------------------- |
| **Incident ID**            | INC-YYYY-MM-DD-XXX          |
| **Date**                   | YYYY-MM-DD                  |
| **Duration**               | X hours Y minutes           |
| **Severity**               | SEV-0 / SEV-1 / SEV-2       |
| **Status**                 | Draft / Reviewed / Complete |
| **Author**                 | @author                     |
| **Incident Commander**     | @commander                  |
| **Postmortem Review Date** | YYYY-MM-DD                  |

---

## Executive Summary

[2-3 sentence summary for leadership. What happened, what was the impact, and what are we doing about it?]

---

## Impact

### User Impact

- **Users Affected**: [Number or percentage]
- **User Experience**: [What did users experience?]

### Business Impact

- **Revenue Impact**: [Estimated $ if applicable]
- **SLA Breach**: Yes / No
- **Customer Communications**: [Were customers notified?]

### Technical Impact

- **Systems Affected**: [List of systems]
- **Data Impact**: [Any data loss or corruption?]

---

## Timeline

> All times in UTC

| Time  | Event                                  | Actor   |
| ----- | -------------------------------------- | ------- |
| HH:MM | [Event 1: e.g., Deployment started]    | @person |
| HH:MM | [Event 2: e.g., First alert fired]     | System  |
| HH:MM | [Event 3: e.g., On-call acknowledged]  | @person |
| HH:MM | [Event 4: e.g., Root cause identified] | @person |
| HH:MM | [Event 5: e.g., Fix deployed]          | @person |
| HH:MM | [Event 6: e.g., Incident resolved]     | @person |

---

## Root Cause

### Technical Root Cause

[Detailed technical explanation of what went wrong. Include code snippets, configuration, or architecture diagrams if helpful.]

### Contributing Factors

- [Factor 1: e.g., Missing monitoring]
- [Factor 2: e.g., Incomplete testing]
- [Factor 3: e.g., Documentation gap]

### Trigger

[What specific event triggered this incident? e.g., "A deployment at 10:00 UTC introduced a bug in..."]

---

## 5 Whys Analysis

1. **Why** did [symptom/impact] happen?
   → Because [cause 1]

2. **Why** did [cause 1] happen?
   → Because [cause 2]

3. **Why** did [cause 2] happen?
   → Because [cause 3]

4. **Why** did [cause 3] happen?
   → Because [cause 4]

5. **Why** did [cause 4] happen?
   → Because [root cause]

---

## Detection

### How Was It Detected?

- [ ] Automated alert
- [ ] User report
- [ ] Internal testing
- [ ] Other: [describe]

### Detection Gap

[Was there a delay in detection? If so, why?]

**Time to Detect (TTD)**: [X minutes]

---

## Response

### What Went Well

- [Positive 1: e.g., Alert fired quickly]
- [Positive 2: e.g., Team coordinated effectively]
- [Positive 3: e.g., Rollback was smooth]

### What Went Poorly

- [Negative 1: e.g., Took too long to identify root cause]
- [Negative 2: e.g., Runbook was outdated]
- [Negative 3: e.g., Communication gaps]

### Where We Got Lucky

- [Lucky 1: e.g., Happened during low-traffic period]

---

## Action Items

### Immediate (< 1 week)

| Priority | Action          | Owner   | Due Date   | Ticket   |
| -------- | --------------- | ------- | ---------- | -------- |
| P0       | [Critical fix]  | @person | YYYY-MM-DD | JIRA-XXX |
| P1       | [Important fix] | @person | YYYY-MM-DD | JIRA-XXX |

### Short-Term (< 1 month)

| Priority | Action        | Owner   | Due Date   | Ticket   |
| -------- | ------------- | ------- | ---------- | -------- |
| P2       | [Improvement] | @person | YYYY-MM-DD | JIRA-XXX |

### Long-Term (< 1 quarter)

| Priority | Action         | Owner   | Due Date   | Ticket   |
| -------- | -------------- | ------- | ---------- | -------- |
| P3       | [Systemic fix] | @person | YYYY-MM-DD | JIRA-XXX |

---

## Lessons Learned

### Technical Lessons

- [Lesson 1]
- [Lesson 2]

### Process Lessons

- [Lesson 1]
- [Lesson 2]

### Recommendations for Similar Systems

[If this could happen to other services, what should they do?]

---

## Prevention

### How Do We Prevent Recurrence?

[Specific technical and process changes that will prevent this exact issue from happening again]

### How Do We Detect It Faster Next Time?

[New alerts, monitoring, or testing that would catch this earlier]

---

## Appendix

### Supporting Evidence

- [Link to logs]
- [Link to metrics dashboard during incident]
- [Link to Slack thread]

### Related Incidents

- [INC-YYYY-MM-DD-XXX: Similar incident]

### Diagram

[Include architecture diagram showing what failed if helpful]

---

## Sign-Off

| Role               | Name       | Date       |
| ------------------ | ---------- | ---------- |
| Author             | @author    | YYYY-MM-DD |
| Tech Lead          | @techlead  | YYYY-MM-DD |
| Incident Commander | @commander | YYYY-MM-DD |

---

## Changelog

| Date       | Author  | Change               |
| ---------- | ------- | -------------------- |
| YYYY-MM-DD | @author | Initial draft        |
| YYYY-MM-DD | @author | Updated after review |
| YYYY-MM-DD | @author | Marked complete      |
