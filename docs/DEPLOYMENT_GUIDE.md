# Deployment Guide

This guide covers production deployment for the Pharmacy Management System.

## 1. Prerequisites

- Node.js 18+ (recommended latest LTS)
- MongoDB Atlas (or managed MongoDB)
- HTTPS-enabled domain for frontend and backend
- Process manager (PM2/systemd) or container platform

## 2. Environment Configuration

Create production env file for backend (`backend/.env`):

Required:
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGINS` (comma-separated allowed origins)
- `CSRF_TRUSTED_ORIGINS` (comma-separated trusted origins)

Recommended:
- `BACKUP_SIGNING_SECRET`
- `BACKUP_SNAPSHOT_ENABLED=true`
- `BACKUP_SNAPSHOT_INTERVAL_MINUTES`
- `BACKUP_SNAPSHOT_KEEP_FILES`
- `OPS_MAX_AUDIT_FAILURES_24H`
- `OPS_MAX_MEMORY_RSS_MB`

Admin bootstrap:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `SUPER_ADMIN_EMAIL`

Frontend env (`frontend/.env`):
- `REACT_APP_API_URL=https://your-api-domain/api`

## 3. Build and Start

### Backend
```bash
cd backend
npm install --omit=dev
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
```

Serve `frontend/build` using Nginx or static host.

## 4. Reverse Proxy (Nginx pattern)

- Route frontend static files from `/`
- Proxy backend API requests to Node app (`/api`)
- Enforce HTTPS redirect
- Set secure headers at proxy layer too

## 5. Go-Live Sequence

1. Configure all env vars.
2. Start backend and verify:
   - `GET /api/health`
   - `GET /api/ready`
3. Build and deploy frontend.
4. Login as admin and confirm:
   - User management works
   - Billing create flow works
   - Stock in/out works
5. Run readiness scripts:
   - `node scripts/releaseGate.js`
   - `npm run compliance:report -- --days 365`
6. Run backup checks:
   - `npm run backup:snapshot-now`
   - `npm run backup:drill`

## 6. Operational Hardening Checklist

- Disable weak/default admin credentials after first login
- Restrict MongoDB network access by IP/security group
- Enable database backups and retention at infrastructure level
- Set log retention and alerting on backend errors
- Monitor:
  - API 5xx rate
  - DB connectivity
  - memory usage
  - backup freshness

## 7. Upgrade Strategy

- Deploy backend first (backward-compatible changes)
- Run migration scripts (if any) before switching traffic
- Deploy frontend build
- Execute smoke test:
  - auth, billing, stock-in/out, reports, admin user create

## 8. Rollback Plan

- Keep previous backend version and frontend build artifact
- If rollback needed:
  1. Switch frontend to last known good build
  2. Roll backend process/image back
  3. Restore data only if a data-migration caused corruption

## 9. Post-Deployment Verification

Use this quick script flow:

```bash
cd backend
npm run ops:health-check
npm run compliance:report -- --days 30
```

Also verify from UI:
- cashier can search and bill medicine
- pharmacist can manage stock
- admin can create users and view ops metrics
