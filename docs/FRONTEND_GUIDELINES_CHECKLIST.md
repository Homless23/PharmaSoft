# Frontend Guidelines Compliance Checklist

Source guideline: `docs/frontend_guidelines.md`

## 1. Frontend Philosophy
- `PASS` Cashier speed + safety focus implemented in billing UX and expiry blocking.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/components/billing/BillingWorkhorse.jsx`
  - `frontend/src/components/billing/ExpiredOverrideModal.jsx`
- `PASS` No silent failures in core data fetch paths (errors now surfaced).
  - `frontend/src/context/globalContext.js`

## 2. User Experience Principles
- `PASS` Role-first UX with route guards + UI-level permission checks.
  - `frontend/src/App.js`
  - `frontend/src/components/AppShell.jsx`
  - `frontend/src/config/rbacPolicy.js`
- `PASS` Billing search is keyboard-friendly + autofocus + debounced lookup.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/components/billing/BillingWorkhorse.jsx`

## 3. Application Layout Rules
- `PASS` Fixed sidebar and header with current user, role indicator, logout.
  - `frontend/src/components/AppShell.jsx`
- `PASS` Main content scrolls within content container.
  - `frontend/src/components/AppShell.jsx`

## 4. Routing & Access Control
- `PASS` Protected routes enforce authentication and permission action.
  - `frontend/src/App.js`
- `PASS` Unauthenticated redirects to `/login`.
  - `frontend/src/App.js`
- `PASS` Authenticated unauthorized users get 403-style UI.
  - `frontend/src/pages/AccessDenied.jsx`
  - `frontend/src/App.js`

## 5. Folder & Code Organization
- `PASS` Frontend follows guideline folder structure.
  - `frontend/src/components`
  - `frontend/src/pages`
  - `frontend/src/context`
  - `frontend/src/services`
  - `frontend/src/config`
  - `frontend/src/hooks`
  - `frontend/src/utils`
  - `frontend/src/data`

## 6. State Management Rules
- `PASS` Global context is used for auth/app state, forms remain local in pages/components.
  - `frontend/src/context/globalContext.js`
  - `frontend/src/pages/*.jsx`

## 7. Forms & Data Entry Guidelines
- `PASS` Critical forms use confirmations and explicit audited intent messaging.
  - Billing finalize confirmation with audit warning:
    - `frontend/src/pages/Billing.jsx`
  - Expired override modal audit warning:
    - `frontend/src/components/billing/ExpiredOverrideModal.jsx`
  - Expiry action modal safety/audit warning:
    - `frontend/src/pages/Categories.jsx`

## 8. Tables, Lists & Search
- `PASS` Large tables use pagination.
  - `frontend/src/pages/MedicineMaster.jsx`
  - `frontend/src/pages/SalesHistory.jsx`
  - `frontend/src/components/modules/inventory/InventoryTable.jsx`
- `PASS` Search inputs are debounced on key list screens.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/pages/Categories.jsx`
  - `frontend/src/pages/SalesHistory.jsx`

## 9. Error Handling Standards
- `PASS` API errors are normalized and shown consistently.
  - `frontend/src/services/api.js`
  - `frontend/src/utils/apiError.js`
  - `frontend/src/components/Toast.jsx`
- `PASS` Session-expired and permission errors now mapped to explicit user-facing messages.
  - `frontend/src/utils/apiError.js`

## 10. Security-Sensitive UI Rules
- `PASS` JWT is not stored in localStorage; cookie auth is used.
  - `frontend/src/services/api.js`
- `PASS` Expired medicine sale is visibly blocked with override path.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/components/billing/ExpiredOverrideModal.jsx`

## 11. Accessibility & Usability
- `PASS` Base typography and minimum 14px baseline set globally.
  - `frontend/src/index.css`
- `PASS` Alerts and status tags include text labels (not color-only).
  - `frontend/src/pages/StockAlerts.jsx`
  - `frontend/src/components/modules/inventory/InventoryTable.jsx`

## 12. Performance Guidelines
- `PASS` Non-critical pages are lazy loaded.
  - `frontend/src/App.js`
- `PASS` Search fetches are debounced and do not block full page.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/pages/Categories.jsx`
  - `frontend/src/pages/SalesHistory.jsx`

## 13. UI Consistency Rules
- `PASS` Primary/secondary/danger button semantics are consistent in main workflows.
  - `frontend/src/pages/Billing.jsx`
  - `frontend/src/pages/Categories.jsx`
  - `frontend/src/pages/MedicineMaster.jsx`

## 14. What Not To Do
- `PASS` No frontend-only security assumptions for sensitive actions (backend RBAC enforced).
  - `frontend/src/App.js`
  - backend parity remains in route middleware (`backend/routes/*`)

## 15. Frontend DoD
- `PASS` Role access enforced.
- `PASS` Errors visible.
- `PASS` Loading states implemented.
- `PASS` Keyboard workflow available in billing.
- `PASS` Billing flow maintained with quick-search and focused interactions.
