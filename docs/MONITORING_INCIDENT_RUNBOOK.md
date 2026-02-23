# Monitoring and Incident Runbook

## 1. Monitoring Minimums
- Uptime monitor every 1 minute:
  - `GET /api/ready` (alert on non-200)
  - `GET /api/health` (track latency and DB status)
- Alert thresholds:
  - 3 consecutive readiness failures => critical incident
  - API p95 latency > 1.5s for 10 minutes => warning
  - Admin ops warnings include `OPS_DB_DISCONNECTED`, `OPS_BACKUP_MISSING`, `OPS_BACKUP_STALE`

## 2. Daily Operational Checks
1. Open Admin -> Production Readiness card.
2. Click `Refresh Compliance`.
3. Verify:
   - `Critical: 0`
   - `Warnings` reviewed and accepted/remediated.
4. Confirm latest backup age is within policy.

## 3. Weekly Controls
1. Run backup drill:
   - `cd backend && npm run backup:drill`
2. Run release gate:
   - `node scripts/releaseGate.js`
3. Record outputs in operations log.

## 4. Incident Severity
- `SEV-1`: Billing outage, data corruption, DB unavailable
- `SEV-2`: Significant degradation, stale backups, high error rate
- `SEV-3`: Minor functional bug with workaround

## 5. Incident Response Flow
1. Detect alert and assign incident owner.
2. Confirm blast radius (roles, tenants, endpoints).
3. Mitigate:
   - restart failing service if transient
   - rollback if release regression
4. Validate:
   - `/api/ready` healthy
   - billing create/void passes
5. Close with postmortem:
   - timeline, root cause, prevention action

## 6. Security Operational Controls
- Rotate `JWT_SECRET` and `BACKUP_SIGNING_SECRET` on schedule.
- Keep `SUPER_ADMIN_EMAIL` mapped to a controlled account.
- Review admin audit logs weekly for suspicious role/user changes.
- Enforce HTTPS termination at reverse proxy/load balancer.

