# PRD and App-Flow Alignment Matrix

This document maps `docs/PRD.md` and `docs/APP flow.md` requirements to current implementation.

## 1. User Entry Flow

Requirement:
- Login -> validate creds -> `/auth/me` -> RBAC -> role-based landing

Implemented in:
- `frontend/src/App.js`
- `frontend/src/pages/Login.js`
- `frontend/src/context/globalContext.js`
- `backend/routes/auth.js`
- `backend/controllers/authController.js`

Status: `Aligned`

## 2. Role-Based Navigation

Requirement:
- Admin, Pharmacist, Cashier, User have distinct capability paths

Implemented in:
- `frontend/src/config/rbacPolicy.js`
- `backend/config/rbacPolicy.js`
- `frontend/src/components/AppShell.jsx`
- `frontend/src/App.js`

Route alignment update applied:
- Canonical routes now use pharmacy naming:
  - `/billing`
  - `/inventory`
  - `/sales-history`
  - `/medicine-master`
- Legacy aliases still supported with redirect:
  - `/budget`
  - `/categories`
  - `/transactions`
  - `/add`

Status: `Aligned`

## 3. Cashier Critical Path (POS)

Requirement:
- Search medicine
- Build cart
- Discount/VAT
- Prescription checks
- Finalize bill
- Print/save

Implemented in:
- `frontend/src/pages/Billing.jsx`
- `frontend/src/components/billing/BillingWorkhorse.jsx`
- `backend/routes/bills.js`
- `backend/controllers/billController.js`

Controls present:
- Expired sale gating with override token
- Interaction warning modal
- Export PDF/XLSX

Status: `Aligned`

## 4. Inventory Lifecycle

Requirement:
- PO -> GRN -> batch available -> expiry action handling
- Expired stock blocked from billing unless admin override

Implemented in:
- `frontend/src/pages/Purchases.jsx`
- `backend/routes/purchases.js`
- `frontend/src/pages/Categories.jsx`
- `backend/routes/categoryRoutes.js`
- `backend/controllers/billController.js`

Status: `Aligned`

## 5. Technical Stack

Requirement:
- React + AntD + Context + Router + Axios + Express + Mongo + RBAC

Implemented in:
- `frontend/package.json`
- `backend/package.json`
- `frontend/src/services/api.js`
- `backend/server.js`

Status: `Aligned`

## 6. Frontend Engineering Rules

Requirement highlights:
- Keyboard-friendly cashier flow
- Clear error states
- Confirm destructive actions

Implemented examples:
- Hotkeys and focus management in billing
- Inline warnings and modals
- Delete confirmations and stock action modals

Known gap:
- Some route pages still include business-heavy transformations in page layer (acceptable short-term, should shift to service/hooks layer for stricter separation)

Status: `Partially Aligned (acceptable for current phase)`

## 7. Backend Architecture Guidelines

Requirement:
- Controller handles HTTP; services handle business logic

Current state:
- Major HTTP and business logic are still mixed in several controllers/routes.
- Some service decomposition exists (`services/backupScheduler`, auth/sale service references in project history), but not complete across all domains.

Recommendation:
1. Extract billing domain logic from controller to `backend/services/billingService.js`
2. Extract inventory stock-in/out logic from routes to `backend/services/inventoryService.js`
3. Keep controllers thin wrappers around service calls

Status: `Partially Aligned`

## 8. Ops and Compliance

Requirement:
- Auditability
- Readiness checks
- Backups and restore

Implemented in:
- `backend/controllers/adminController.js`
- `backend/routes/admin.js`
- `backend/scripts/releaseGate.js`
- `backend/scripts/complianceReadinessReport.js`
- `RELEASE_GO_LIVE_CHECKLIST.md`

Status: `Aligned`

## 9. Definition of Done Checks

Requirement:
- RBAC enforced
- Audit log recorded
- Error path handled
- Manual workflow tested
- Billing speed preserved

Current practical interpretation:
- RBAC: enforced frontend and backend
- Audit: implemented for sensitive flows
- Error paths: explicit for major APIs
- Manual flow validation: done iteratively in app refinement
- Billing speed: optimized search + keyboard flow present

Status: `Aligned for MVP+ production phase`

## 10. Priority Next Steps (from PRD)

1. Service-layer extraction for billing/inventory domain logic
2. Formal API contract examples per endpoint (started in `docs/API_EXAMPLES.md`)
3. Load and stress testing for finalize billing + quick search
4. Multi-pharmacy tenancy hardening if product scope expands beyond single-owner tenant model

## 11. Recent PRD-Driven Implementation Pass

Implemented in this pass:
- Added consolidated dashboard summary API for PRD dashboard KPIs and performance:
  - `GET /api/v1/dashboard/summary`
  - Source: `backend/controllers/insightController.js`, `backend/routes/transactions.js`
- Updated dashboard UI to consume single summary endpoint instead of multiple per-day EOD requests:
  - `frontend/src/pages/Dashboard.jsx`
- Tightened sensitive route protections with explicit rate limits:
  - Billing write/read/override routes in `backend/routes/bills.js`
  - Analytics summary/insight routes in `backend/routes/transactions.js`

PRD impact:
- Improves dashboard responsiveness and reduces API fan-out (`§7 Performance`)
- Hardens abuse controls on sensitive billing/admin workflows (`§7 Security`)
- Preserves dashboard control-tower expectations (`§5.5 Dashboard, Reports & Alerts`)
