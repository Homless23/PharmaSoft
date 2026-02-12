# Expense Tracker - Improvements

## Current Project Layout
- Frontend: `frontend/`
- Backend: `backend/`

`Client/` and `Server/` were removed to avoid duplicate code paths and configuration drift.

## Key Fixes Applied

### Backend
1. Fixed expense amount validation and numeric coercion in `backend/controllers/expenseController.js`.
2. Improved auth middleware return flow in `backend/middleware/authMiddleware.js`.
3. Corrected `Expense` schema constraints in `backend/models/Expense.js`.

### Frontend
1. Standardized API access with shared client in `frontend/src/services/api.js`.
2. Updated global context to use the shared client in `frontend/src/context/globalContext.js`.
3. Hardened grouping logic and input safety in `frontend/src/hooks/useGroupedExpenses.js`.
4. Added regression tests for grouped expenses in `frontend/src/hooks/useGroupedExpenses.test.js`.
5. Removed mojibake/broken text in transaction and profile UI components.

## Run Locally

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Notes
- Frontend API base URL: `REACT_APP_API_URL` (defaults to `http://localhost:5000/api`).
- JWT secret env var for backend: `JWT_SECRET`.
