# Pharmacy Management System - Project Documentation

## 1. Overview

This project is a full-stack Pharmacy Management System designed for real pharmacy operations, not demo-only use.

Primary goals:
- Fast cashier billing workflow
- Safe medicine inventory with batch/expiry tracking
- Role-based access and auditability
- Production operations support (backup, readiness, health checks)

Technology:
- Frontend: React + Ant Design
- Backend: Node.js + Express
- DB: MongoDB via Mongoose

## 2. Repository Structure

```text
.
|- backend/
|  |- config/            # env, DB, RBAC, runtime config
|  |- controllers/       # request handlers
|  |- middleware/        # auth, rate limit, CSRF origin protection
|  |- models/            # mongoose schemas
|  |- routes/            # API route definitions
|  |- scripts/           # audits, migrations, seeders, readiness scripts
|  |- services/          # backup scheduler and service utilities
|  `- server.js          # API bootstrapping and route registration
|- frontend/
|  |- src/components/    # shared, module, billing, app shell components
|  |- src/pages/         # app pages
|  |- src/context/       # global state provider
|  |- src/config/        # frontend RBAC policy
|  |- src/services/      # API client
|  `- src/data/          # medicine master and NLEM library files
|- docs/                 # runbooks, SOPs, deployment docs
|- scripts/              # top-level ops scripts
|- RELEASE_GO_LIVE_CHECKLIST.md
`- README.md
```

## 3. Core Product Modules

### 3.1 Authentication and Session
- User registration/login and admin login
- Cookie-based authenticated API calls (`withCredentials: true`)
- Profile update and password change
- Login event capture for admin visibility

### 3.2 Role-Based Access Control (RBAC)
Roles:
- `admin`
- `pharmacist`
- `cashier`
- `user`

RBAC action policy is defined in:
- Frontend: `frontend/src/config/rbacPolicy.js`
- Backend: `backend/config/rbacPolicy.js`

### 3.3 Medicine Master and Inventory
- Medicine creation/editing
- SKU/barcode/rack/manufacturer metadata
- Stock quantity and reorder points
- Batch-aware stock state
- Expiry action lifecycle (`none`, `return_to_supplier`, `clearance`, `quarantine`, `disposed`)

### 3.4 Billing / POS
- Quick medicine search
- Line-item billing with qty/rate/discount/vat
- Cart and total calculation
- Bill finalization API
- IRD-style bill numbering support on backend
- Prescription verification workflow and override controls

### 3.5 Purchases and Supplier Ledger
- Create purchase orders
- Receive GRN (stock update)
- Track supplier payments/outstanding
- Supplier ledger with export support

### 3.6 Dashboard / Reports / Alerts
- Sales/procurement dashboards
- Expiry and low-stock monitoring
- History and reports with filters and exports

### 3.7 Admin Operations
- User management (create/update role/delete)
- Login and audit visibility
- Release readiness checks
- Compliance report run triggers
- Backup export/validate/import

## 4. Runtime and API Architecture

Backend entrypoint: `backend/server.js`

Key runtime behavior:
- Validates environment on boot
- Connects MongoDB
- Bootstraps/syncs admin account from env
- Applies security headers, CORS, CSRF-origin protection
- Registers API routes
- Exposes health/readiness endpoints

Health endpoints:
- `GET /api/health`
- `GET /api/ready`

## 5. API Route Map

Base URL: `/api`

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/admin/login`
- `POST /auth/logout`
- `GET /auth/me`
- `PUT /auth/profile`
- `PUT /auth/password`

Notifications:
- `GET /notifications`
- `POST /notifications`
- `POST /notifications/read-all`

Transactions (`/api/v1`):
- `POST /transactions`
- `GET /transactions`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`
- `GET /transactions/insights`
- `GET /transactions/recurring-alerts`
- `POST /transactions/process-recurring-due`
- `POST /transactions/:id/generate-recurring`

Categories / inventory (`/api/v1`):
- `GET /categories`
- `GET /categories/quick-search`
- `POST /categories/add`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `POST /categories/:id/stock-in`
- `POST /categories/:id/stock-out`
- `GET /categories/summary`
- `POST /categories/:id/expiry-action`
- `POST /categories/cleanup-duplicates` (admin role)

Purchases (`/api/v1`):
- `POST /purchases`
- `GET /purchases`
- `POST /purchases/:id/receive`
- `POST /purchases/:id/payment`
- `GET /purchases/supplier-ledger`

Bills (`/api/v1`):
- `POST /bills`
- `POST /bills/finalize`
- `POST /bills/expired-override-token` (admin role)
- `GET /bills`
- `GET /bills/end-of-day`
- `GET /bills/customers`
- `GET /bills/:id`
- `PUT /bills/:id/verify-prescription`
- `DELETE /bills/:id`

Settings (`/api/v1`):
- `GET /settings`
- `PUT /settings`

Goals (`/api/v1`):
- `GET /goals`
- `POST /goals`
- `PUT /goals/:id`
- `DELETE /goals/:id`

Budgets (`/api/v1`):
- `POST /budgets/auto-allocate`

Admin (`/api/admin`):
- User management: `/users`, `/users/:id/role`
- Auth/audit visibility: `/logins`, `/audit-logs`
- Ops: `/ops/metrics`, `/ops/release-readiness`, `/ops/release-gate/run`, `/ops/compliance/run`
- Backup: `/backup/export`, `/backup/validate`, `/backup/import`
- Other admin ops: `/expired-overrides`, `/categories/cleanup-duplicates`, `/seed-random-entries`

## 6. Frontend Application Routing

Main routes are defined in `frontend/src/App.js`.

Notable protected pages:
- `/dashboard`
- `/budget` (billing/POS)
- `/add` (medicine master)
- `/categories` (medicine info/inventory)
- `/purchases`
- `/reports`
- `/stock-alerts`
- `/settings`
- `/admin`
- `/analytics`

Auth pages:
- `/login`
- `/signup`
- `/admin/login`

## 7. Configuration and Environment

### Backend (`backend/.env`)
See `backend/.env.example` for complete keys.

Critical keys:
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

Admin bootstrap:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `SUPER_ADMIN_EMAIL`

Backup and operations thresholds:
- `BACKUP_*`
- `OPS_*`

### Frontend (`frontend/.env`)
See `frontend/.env.example`.

Common keys:
- `REACT_APP_API_URL`
- `REACT_APP_ENABLE_DEMO_MEDICINE_SEED`

## 8. Local Development

Install:
```bash
cd backend && npm install
cd ../frontend && npm install
```

Run backend:
```bash
cd backend
npm start
```

Run frontend:
```bash
cd frontend
npm start
```

## 9. Build, Test, and Ops Scripts

### Backend scripts (from `backend/package.json`)
- `npm start`
- `npm run cleanup:categories`
- `npm run seed:transactions`
- `npm run smoke:billing`
- `npm run audit:consistency`
- `npm run backup:drill`
- `npm run backup:snapshot-now`
- `npm run compliance:report`
- `npm run audit:backfill-bill-finalize`
- `npm run migrate:legacy-invoices-ird`
- `npm run ops:health-check`

### Frontend scripts (from `frontend/package.json`)
- `npm start`
- `npm run build`
- `npm test`
- `npm run test:ci`

## 10. Security Controls Present

- JWT-based authentication
- Role/action based authorization middleware
- IP-based rate limiting on sensitive endpoints
- CORS allowlist support
- CSRF origin protection middleware
- Security headers (XFO, CSP, HSTS in production, etc.)
- Request ID tagging and structured request logging

## 11. Data and Compliance Notes

- Bill numbering and readiness checks are included for regulated invoice workflows.
- Expired sale overrides are tokenized and auditable.
- Backup export/validate/import includes checksum support.
- Release/compliance scripts are provided for production gatekeeping.

## 12. Existing Operational Documents

Use these for deployment and operations:
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/MONITORING_INCIDENT_RUNBOOK.md`
- `docs/STAGING_ROLLOUT_CHECKLIST.md`
- `RELEASE_GO_LIVE_CHECKLIST.md`
- `docs/PHARMACY_USER_SOP.md`

## 13. Recommended Next Documentation (Optional)

- API examples (request/response payloads) per endpoint
- ER diagram for major models
- Tenant/account lifecycle and backup restore playbook per pharmacy
- Pharmacy onboarding checklist (admin, pharmacist, cashier)
