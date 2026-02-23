# Troubleshooting Guide

## 1. Backend Fails to Start

### Symptom
Server exits with env errors like:
- `CORS_ORIGINS must include at least one origin`
- `CSRF_TRUSTED_ORIGINS must include at least one trusted origin`

### Fix
Set both variables in `backend/.env`:
```env
CORS_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

Use production origins when deployed.

---

## 2. MongoDB Connection Issues

### Symptom
- `MongoDB Connected` never appears
- requests fail with DB errors

### Fix
- Verify `MONGO_URI`
- Check Atlas IP allowlist / network access
- Ensure credentials are valid
- Test DB health endpoint:
  - `GET /api/health`

---

## 3. Cashier Cannot See Medicines in Billing Search

### Symptom
Typing 3+ letters shows no suggestions.

### Fix
- Confirm medicine records exist under the same tenant/admin
- Check role permissions include medicine view
- Confirm API call `/v1/categories/quick-search` returns data
- Re-login to refresh tenant context if account recently changed

---

## 4. Notifications Look Wrong Across Accounts

### Symptom
A user sees irrelevant/admin notifications.

### Fix
- Verify each account logs in separately (no shared browser session confusion)
- Ensure notification endpoints are called with authenticated user cookie
- Re-check tenant scoping logic in global context and backend notification routes

---

## 5. Frontend Build Works But UI Flickers

### Symptom
Page visibly flickers on navigation/login.

### Fix
- Confirm login redirects to role route (not hardcoded dashboard route)
- Avoid duplicate `getData()` calls from multiple effects on same mount
- Keep route guards consistent with RBAC actions

---

## 6. AntD Dev Warnings in `npm start`

### Symptom
Warnings:
- `onAfterSetupMiddleware` deprecated
- `onBeforeSetupMiddleware` deprecated

### Fix
These are CRA webpack-dev-server deprecation warnings and do not block runtime.
For long-term fix, migrate away from CRA or update build tooling stack.

---

## 7. Backup Import Rejected

### Symptom
- checksum mismatch
- size-limit exceeded

### Fix
- Validate backup first via `/admin/backup/validate`
- Ensure same signing secret if checksum is enforced
- If not importing bills, disable `includeBills` in request
- Review `BACKUP_IMPORT_MAX_RECORDS`

---

## 8. 403 CORS Errors

### Symptom
API returns `CORS_ORIGIN_FORBIDDEN`.

### Fix
- Add exact frontend origin to `CORS_ORIGINS`
- Ensure protocol/port match exactly
- Restart backend after env update

---

## 9. Billing Finalize Fails for Expired Medicines

### Symptom
Finalize returns expired override required error.

### Fix
- Admin issues override token via admin panel
- Cashier/pharmacist enters override token + reason
- Confirm token is unexpired and one-time unused

---

## 10. Quick Diagnostic Commands

Backend syntax checks:
```bash
cd backend
node --check server.js
node --check controllers/adminController.js
```

Frontend production build:
```bash
cd frontend
npm run build
```

Backend health endpoints:
- `GET /api/health`
- `GET /api/ready`

---

## 11. When to Escalate

Escalate to code/database review when:
- repeated data inconsistency in bills or stock
- duplicate invoice numbering behavior
- tenant data appears cross-visible
- backup restore produces partial/missing records
