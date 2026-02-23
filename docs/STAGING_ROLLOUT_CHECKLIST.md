# Staging Rollout Checklist

## Before Staging Deploy
1. Pull latest main branch.
2. Verify no pending migration conflicts.
3. Run locally:
   - `node scripts/releaseGate.js`

## Deploy to Staging
1. Deploy backend.
2. Deploy frontend.
3. Validate:
   - `GET /api/health`
   - `GET /api/ready`
4. Login with admin and run:
   - `Run Release Gate` from Admin panel
   - `Refresh Compliance` from Admin panel

## Functional Smoke on Staging
1. Add medicine in admin account.
2. Login as cashier and create a bill.
3. Void one bill as admin.
4. Verify audit logs include billing actions.
5. Verify backups are generated and drill passes.

## Go/No-Go Criteria
- Release gate: passed
- Compliance criticals: 0
- Billing flow smoke: passed
- No unresolved P1/P2 issues

