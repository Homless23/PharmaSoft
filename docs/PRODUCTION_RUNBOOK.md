# Production Runbook

## 1. Pre-deploy Checklist
- Confirm `backend/.env` contains production secrets and valid values:
  - `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
  - `BACKUP_SIGNING_SECRET`, `SUPER_ADMIN_EMAIL`
- Verify app build/tests locally:
  - `cd frontend && npm run test:ci -- --runInBand && npm run build`
  - `cd backend && node --check server.js`
- Run gate:
  - `node scripts/releaseGate.js`
- Ensure gate summary is fully passed (`failedRequired: 0`).

## 2. Deployment Steps
1. Take database backup snapshot:
   - `cd backend && npm run backup:snapshot-now`
2. Deploy backend first (new API/contracts).
3. Run health probes:
   - `GET /api/health`
   - `GET /api/ready`
4. Deploy frontend.
5. Login as admin and verify:
   - billing create + void
   - admin user/role management
   - production readiness card status

## 3. Rollback Plan
1. Trigger rollback if:
   - `/api/ready` is failing for >5 minutes
   - critical billing path fails
   - data corruption suspected
2. Rollback actions:
   - Redeploy previous backend artifact/version
   - Redeploy previous frontend artifact/version
   - Validate health endpoints
3. If data issue occurred:
   - validate latest snapshot: `cd backend && npm run backup:drill`
   - import backup through admin backup import endpoint after validating checksum

## 4. Post-deploy Validation
- Run from admin panel:
  - `Run Release Gate`
  - `Refresh Compliance`
- Confirm:
  - critical count = 0
  - release gate status = PASSED
- Capture evidence (screenshot + timestamp) in deployment notes.

## 5. Change Control
- Every production deploy must include:
  - commit hash
  - operator name
  - release gate output
  - rollback decision and result

