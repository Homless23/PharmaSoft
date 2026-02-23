# Release Go-Live Checklist

## Blocking checks
1. Run `node scripts/releaseGate.js`
2. Ensure all required steps pass:
   - Preflight release
   - Audit consistency
   - Backup drill snapshots
   - Compliance readiness report

## Optional checks
1. Run smoke billing flow with explicit flag:
   - `node scripts/releaseGate.js --with-smoke`
2. Smoke requires:
   - `SMOKE_API_BASE`
   - `SMOKE_ADMIN_EMAIL`
   - `SMOKE_ADMIN_PASSWORD`

## Environment readiness
1. `backend/.env` contains:
   - `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
   - backup settings (`BACKUP_*`)
2. Admin bootstrap account is configured and secured.
3. Production HTTPS termination is enabled.

## Data safety
1. `npm run backup:snapshot-now` completed successfully.
2. `npm run backup:drill` passed for all tenants.
3. Backup snapshots are retained and monitored.

## Compliance readiness
1. `npm run compliance:report -- --days 365` has `criticalCount: 0`.
2. Any warnings are reviewed and documented before go-live.

## Post-deploy verification
1. Health endpoints:
   - `GET /api/health`
   - `GET /api/ready`
2. Verify:
   - cashier billing create/void flow
   - stock in/out updates
   - admin user/role operations
3. Check `GET /api/admin/ops/metrics` warnings list is empty (or accepted).

