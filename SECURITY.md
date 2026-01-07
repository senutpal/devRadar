# Security Policy

## Our Commitment

Security is a core principle at DevRadar. We handle real-time developer activity data, and we take that responsibility seriously.

### What We Promise

- ✅ **NEVER** transmit actual code content to our servers
- ✅ **NEVER** track individual keystrokes
- ✅ **NEVER** sell user data to third parties
- ✅ Users maintain full control over their visibility
- ✅ GDPR/CCPA compliant data handling

---

## Supported Versions

| Version | Supported              |
| ------- | ---------------------- |
| 2.x.x   | ✅ Currently supported |
| 1.x.x   | ⚠️ Security fixes only |
| < 1.0   | ❌ No longer supported |

We recommend always using the latest version.

---

## Reporting a Vulnerability

We take all security vulnerabilities seriously. Thank you for helping keep DevRadar and our users safe.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report via one of these channels:

1. **Email**: security@devradar.io
2. **PGP Encrypted**: Use our [PGP key](https://devradar.io/.well-known/security-pgp-key.txt)

### What to Include

Please provide:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact assessment
- Any proof-of-concept code (if applicable)

### Our Response

| Timeline | Action                                         |
| -------- | ---------------------------------------------- |
| 24 hours | Initial acknowledgment                         |
| 72 hours | Initial assessment and severity classification |
| 7 days   | Detailed response with remediation plan        |
| 30 days  | Target fix release (for Critical/High)         |
| 90 days  | Public disclosure (coordinated)                |

### Severity Classification

| Severity     | Description                         | Response Time |
| ------------ | ----------------------------------- | ------------- |
| **Critical** | RCE, data breach, auth bypass       | < 72 hours    |
| **High**     | Privilege escalation, data exposure | < 7 days      |
| **Medium**   | Limited data access, DOS            | < 30 days     |
| **Low**      | Minor information disclosure        | Next release  |

---

## Security Best Practices for Users

### Keep Your Extension Updated

Enable auto-updates in VS Code to receive security patches automatically.

### Protect Your Account

- Use GitHub's two-factor authentication
- Review connected applications periodically
- Revoke access if you stop using DevRadar

### Use Privacy Features

- Enable **Incognito Mode** when working on sensitive projects
- Configure file blacklists for sensitive files (e.g., `.env`, credentials)
- Review your privacy settings in the extension

### Report Suspicious Activity

If you notice unusual activity on your account, contact support@devradar.io immediately.

---

## Security Measures We Implement

### Authentication & Authorization

- OAuth 2.0 with PKCE for secure authentication
- Short-lived access tokens (15 minutes)
- One-time-use refresh tokens
- Role-based access control (RBAC)

### Data Protection

- TLS 1.3 for all communications
- AES-256 encryption at rest
- No storage of actual code content
- File path hashing for Conflict Radar feature

### Infrastructure

- Regular security patching
- WAF (Web Application Firewall)
- DDoS protection
- SOC 2 Type II compliance (in progress)

### Development Practices

- Mandatory code review for all changes
- Automated security scanning (CodeQL, Trivy)
- Dependency vulnerability monitoring (Dependabot)
- Pre-commit secret detection (gitleaks)

---

## Bug Bounty Program

We're working on a formal bug bounty program. In the meantime:

- We will acknowledge security researchers in our Hall of Fame
- We will provide swag/credits for qualifying reports
- We will not take legal action against researchers acting in good faith

---

## Contact

- **Security Team**: security@devradar.io
- **General Support**: support@devradar.io
- **PGP Key**: [Download](https://devradar.io/.well-known/security-pgp-key.txt)

---

## Changelog

| Date       | Change                  |
| ---------- | ----------------------- |
| 2026-01-01 | Initial security policy |
