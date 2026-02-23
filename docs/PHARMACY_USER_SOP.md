# Pharmacy User SOP (Standard Operating Procedure)

## Roles
- Admin: user/role management, compliance oversight, backup/restore actions.
- Pharmacist: prescription verification, stock operations, safety checks.
- Cashier: quick billing, payment capture, customer checkout.

## Daily Opening
1. Admin login check:
   - verify readiness card status
   - verify backup age and warnings
2. Pharmacist check:
   - expiring medicines list
   - low stock list

## Billing SOP
1. Cashier searches medicine by typing at least 3 letters.
2. Select correct batch and quantity.
3. Confirm price and discount.
4. Finalize bill and collect payment.
5. For prescription-required items:
   - pharmacist verifies prescription before completion.

## Expired Medicine Override SOP
1. Cashier cannot override directly.
2. Admin issues one-time override token with reason and TTL.
3. Cashier enters token and completes supervised sale.
4. Admin reviews override audit table at end of shift.

## End-of-Day Closing
1. Run end-of-day report.
2. Verify cash vs digital totals.
3. Check compliance status (critical must be 0).
4. Confirm backup snapshot exists and is recent.

## Incident Escalation
1. If billing fails:
   - stop affected transactions
   - notify admin immediately
2. Admin runs health checks and readiness actions.
3. If unresolved, follow rollback/incident runbook.

