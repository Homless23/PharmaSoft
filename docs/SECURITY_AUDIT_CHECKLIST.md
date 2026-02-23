# Security Audit Checklist

Source of truth: `docs/security.md`

## 1. Security Philosophy
- `PASS` Backend authority and defense-in-depth are enforced through middleware and RBAC.

## 2. Authentication Security
- `PASS` JWT auth in HTTP-only cookie.
  - `backend/controllers/authController.js`
- `PASS` Cookie policy hardened:
  - `httpOnly: true`
  - `sameSite: 'strict'`
  - `secure: production`
  - token max-age driven by `ACCESS_TOKEN_TTL_MINUTES` (15-30)
  - `backend/controllers/authController.js`
- `PASS` Access token expiry policy (15-30 minutes).
  - `backend/controllers/authController.js`
  - `backend/config/env.js`
- `PASS` Immediate token invalidation on password change via `tokenVersion`.
  - `backend/models/User.js`
  - `backend/controllers/authController.js`
  - `backend/middleware/authMiddleware.js`
- `PASS` Login protection:
  - user login rate limit 5/min/IP
  - admin login rate limit 3/min/IP
  - failed login audit + event logging
  - `backend/routes/auth.js`
  - `backend/controllers/authController.js`

## 3. Authorization & RBAC
- `PASS` Action-based authorization middleware enforced on protected routes.
  - `backend/middleware/authMiddleware.js`
  - `backend/config/rbacPolicy.js`
  - `backend/routes/*.js`
- `PASS` Privileged actions protected and audited (role changes, override, bill delete/finalize).
  - `backend/controllers/adminController.js`
  - `backend/controllers/billController.js`

## 4. Input Validation & Injection Protection
- `PASS` Mongo operator injection guard added globally.
  - blocks `$gt`, `$ne`, `$where`, `$regex`, any `$` key, dotted keys
  - `backend/middleware/mongoInjectionGuard.js`
  - `backend/server.js`
- `PASS` Unknown-field rejection enabled on sensitive auth/billing endpoints.
  - `backend/middleware/requestSchema.js`
  - `backend/routes/auth.js`
  - `backend/routes/bills.js`
- `PARTIAL` Full strict schema validation is not yet universal across every endpoint.
  - Recommendation: add per-route schema validators for all write routes.

## 5. Rate Limiting & Abuse Prevention
- `PASS` Request ID tagging present.
  - `backend/server.js`
- `PASS` Security-defined thresholds implemented:
  - Login: 5/min/IP
  - Admin login: 3/min/IP
  - Bill finalize: 30/min/user
  - Override token: 3/hour/admin
  - `backend/routes/auth.js`
  - `backend/routes/bills.js`
  - `backend/middleware/rateLimit.js`

## 6. CSRF & CORS Protection
- `PASS` Allowlist CORS only, credentials explicit, no wildcard.
  - `backend/server.js`
- `PASS` CSRF origin enforcement on state-changing cookie-auth requests.
  - `backend/middleware/csrfOrigin.js`

## 7. Data Integrity & Business Rules
- `PASS` Finalized bill mutation protections + controlled void flow.
  - `backend/controllers/billController.js`
  - `backend/models/Bill.js`
- `PASS` Expiry enforcement with admin override token + reason + audit path.
  - `backend/controllers/billController.js`

## 8. Error Handling & Disclosure
- `PASS` Generic API responses, no stack traces returned to clients.
  - `backend/server.js`
  - `backend/utils/apiResponse.js`
- `PASS` Internal logging retains request correlation ID.
  - `backend/server.js`

## 9. Audit Logging & Monitoring
- `PASS` Append-only audit logs enforced at model level.
  - `backend/models/AuditLog.js`
- `PASS` Mandatory events largely covered:
  - login success/failure, role changes, bill finalize/void, overrides, backup import/export
  - `backend/controllers/authController.js`
  - `backend/controllers/adminController.js`
  - `backend/controllers/billController.js`

## 10. Backup & Recovery Security
- `PASS` Backup export/import encryption implemented (AES-256-GCM envelope).
  - `backend/controllers/adminController.js`
- `PASS` Checksum validation retained.
  - `backend/controllers/adminController.js`
- `PASS` Admin-only access enforced.
  - `backend/routes/admin.js`
- `PASS` Restore actions audited.
  - `backend/controllers/adminController.js`

## 11. Deployment & Environment Security
- `PARTIAL` Runtime environment validation enforces key security vars.
  - `backend/config/env.js`
  - Includes `JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`, CORS/CSRF, backup key checks.
- `OUTSIDE_CODEBASE` HTTPS-only, firewall, non-root process, closed ports require deployment/platform controls.

## 12. Incident Response
- `PARTIAL` Technical enabler present (`tokenVersion` invalidation and audit visibility), but no single automated “rotate + revoke all” script yet.

## 13. Security DoD
- `PASS` Core implementation now satisfies auth, RBAC, anti-abuse, CSRF/CORS, auditability, and encrypted backup controls.
