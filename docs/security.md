# SECURITY.md

## Pharmacy Management System (PMS)
**Security Policy & Implementation Guide**

> This document defines the security model, controls, and implementation requirements for the Pharmacy Management System (PMS). The goal is not to claim the system is *unhackable*, but to ensure **defense-in-depth, detectability, and recoverability** consistent with production-grade systems.

---

## 1. Security Philosophy

### Core Principles
1. **Zero Trust** – No request is trusted by default
2. **Backend is the source of truth** – Frontend checks are advisory only
3. **Least Privilege** – Users get only what they need
4. **Defense in Depth** – Multiple layers protect critical operations
5. **Auditability over secrecy** – Every sensitive action is traceable

---

## 2. Authentication Security

### 2.1 Authentication Method
- JWT-based authentication
- Tokens stored in **HTTP-only cookies**
- No tokens stored in localStorage or sessionStorage

### 2.2 Cookie Configuration (Required)
```js
{
  httpOnly: true,
  secure: true,          // production only
  sameSite: "strict",
  maxAge: 15 * 60 * 1000 // 15 minutes
}
```

### 2.3 Token Policy
- Access token expiry: **15–30 minutes**
- Secret stored only in environment variables
- Separate secrets for dev, staging, production
- Immediate invalidation on password change

### 2.4 Login Protection
- Rate-limited login endpoints
- Failed login attempts logged
- Admin login separated from user login

---

## 3. Authorization & RBAC

### 3.1 Role-Based Access Control
- Roles: `admin`, `pharmacist`, `cashier`, `user`
- Action-based permissions, not role checks

Example:
```js
authorize("bills.finalize")
```

### 3.2 Enforcement Rules
- All protected routes require:
  - Authentication middleware
  - Authorization middleware
- No RBAC logic inside controllers
- Frontend permissions must mirror backend but never replace it

### 3.3 Privileged Actions (Strict)
- Expired medicine overrides
- Bill deletion
- Price modification
- Role changes

All privileged actions MUST:
- Require admin permission
- Be logged in audit logs

---

## 4. Input Validation & Injection Protection

### 4.1 Request Validation
- All request bodies validated against strict schemas
- Unknown fields rejected
- Type enforcement enabled

### 4.2 MongoDB Injection Defense
- Block operators: `$gt`, `$ne`, `$where`, `$regex`
- Use Mongoose strict mode
- No raw queries from request input

### 4.3 File & Data Safety
- No direct file uploads without validation
- All imports validated before persistence

---

## 5. Rate Limiting & Abuse Prevention

### 5.1 Rate Limits (Minimum)

| Endpoint | Limit |
|-------|------|
| Login | 5 attempts / minute / IP |
| Admin login | 3 attempts / minute / IP |
| Bill finalize | 30 requests / minute / user |
| Override token | 3 requests / hour / admin |

### 5.2 Anti-Automation
- Request ID tagging
- Suspicious patterns logged

---

## 6. CSRF & CORS Protection

### 6.1 CORS
- Allowlist-based origins only
- Credentials allowed explicitly
- No wildcard origins

### 6.2 CSRF Protection
- Trusted origin validation
- Reject requests without valid `Origin` or `Referer`
- Enforced on all state-changing requests

---

## 7. Data Integrity & Business Rules

### 7.1 Immutable Records
- Finalized bills are immutable
- Corrections require new adjustment records
- Silent updates are prohibited

### 7.2 Expiry Enforcement
- Backend checks expiry on every billing request
- Expired stock cannot be sold without override token
- Override requires:
  - Admin permission
  - Reason
  - Audit log entry

---

## 8. Error Handling & Information Disclosure

### 8.1 User-Facing Errors
- Generic error messages only
- No stack traces in production

### 8.2 Internal Logging
- Full error details logged server-side
- Correlation via request IDs

Never expose:
- Database errors
- JWT validation errors
- Schema or table names

---

## 9. Audit Logging & Monitoring

### 9.1 Mandatory Audit Events
- Login (success & failure)
- Role changes
- Billing finalize
- Expiry overrides
- Stock corrections
- Backup & restore operations

### 9.2 Audit Log Properties
- Actor ID
- Action
- Entity type & ID
- Timestamp
- Metadata snapshot

Audit logs are append-only.

---

## 10. Backup & Recovery Security

### 10.1 Backup Rules
- Encrypted exports
- Checksum validation
- Access restricted to admin role

### 10.2 Restore Rules
- Restore actions logged
- Restore validation required before acceptance

Backups are treated as sensitive assets.

---

## 11. Deployment & Environment Security

### 11.1 Environment Configuration
- `.env` files never committed
- Secrets injected via environment variables
- Separate configs per environment

### 11.2 Server Hardening
- HTTPS only
- Firewall enabled
- Non-root Node.js process
- Unused ports closed

### 11.3 Dependency Security
- Lockfiles committed
- Regular `npm audit`
- No unverified third-party packages

---

## 12. Incident Response

### If a Security Incident Is Suspected:
1. Rotate JWT secrets
2. Invalidate active sessions
3. Review audit logs
4. Restore from verified backup if required
5. Document incident and remediation

---

## 13. Security Definition of Done (DoD)

A feature is **SECURE** only if:
- Auth & RBAC enforced
- Input validated
- Errors handled safely
- Audit log recorded
- Abuse vectors considered

---

## 14. Disclaimer

No system is completely unhackable.
This PMS is designed to be:
- **Hard to compromise**
- **Impossible to compromise silently**
- **Recoverable if compromised**

That is the real standard of production security.

---

**Maintainers:** PMS Core Team  
**Last Reviewed:** YYYY-MM-DD

