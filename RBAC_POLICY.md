# RBAC Policy

This project uses a single role-to-capability table in code:

- Backend: `backend/config/rbacPolicy.js`
- Frontend: `frontend/src/config/rbacPolicy.js`

Both files must stay in sync.

## Role Matrix

| Capability | admin | pharmacist | cashier | user |
|---|---|---|---|---|
| `medicine.view` | yes | yes | yes | yes |
| `medicine.write` | yes | yes | no | no |
| `medicine.delete` | yes | no | no | no |
| `stock.manage` | yes | yes | no | no |
| `billing.access` | yes | yes | yes | no |
| `billing.delete` | yes | no | no | no |
| `prescription.verify` | yes | yes | no | no |
| `reports.view.profit` | yes | no | no | no |
| `expenses.manage` | yes | yes | no | no |
| `expenses.delete` | yes | no | no | no |
| `budgets.manage` | yes | yes | no | no |
| `admin.users.manage` | yes | no | no | no |

## Notes

- Admin-only deletes are enforced in backend routes and reflected in frontend UI.
- Cashier is restricted to billing flow and cannot access profit reports or expense/procurement modules.
- Prescription verification is limited to admin and pharmacist.
