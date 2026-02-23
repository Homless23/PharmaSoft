# Frontend Guidelines – Pharmacy Management System (PMS)

These guidelines define **how the frontend should be designed, structured, and implemented** for a production‑grade Pharmacy Management System. They are written to support **speed at the counter, safety, auditability, and long‑term maintainability**.

---

## 1. Frontend Philosophy (Non‑Negotiable)

1. **Cashier speed > visual beauty**
2. **Safety > convenience** (especially for expiry & prescription flows)
3. **Clarity over clever UI**
4. **No silent failures** — every error must be visible
5. **Frontend never trusts itself** (backend is the authority)

If a UI decision slows billing or hides risk, it is wrong.

---

## 2. User Experience Principles

### 2.1 Role‑First UX
- UI must change based on role (`admin`, `pharmacist`, `cashier`)
- Users should never *see* actions they cannot perform
- Route guards + UI guards must both exist

### 2.2 Speed‑Critical Screens
Applies mainly to:
- Billing / POS
- Medicine search

Rules:
- Keyboard‑friendly navigation
- Autofocus on primary input
- Minimal modals (max depth = 2)
- Avoid page reloads

---

## 3. Application Layout Rules

### 3.1 Global Layout
- Fixed sidebar for navigation
- Header with:
  - Current user
  - Role indicator
  - Logout
- Main content scrolls, not the whole page

### 3.2 Page Structure
Each page should follow:
```
Page Title
Short Context / Status (optional)
Primary Action Area
Main Content
Secondary / Destructive Actions (last)
```

---

## 4. Routing & Access Control

### 4.1 Route Protection
- Every protected route must:
  - Check authentication
  - Check role permissions

### 4.2 Unauthorized Behavior
- Redirect to `/login` if unauthenticated
- Show **403-style UI** if authenticated but unauthorized

Never rely on frontend-only checks.

---

## 5. Folder & Code Organization

```
src/
 ├── components/   # Reusable UI (tables, modals, inputs)
 ├── pages/        # Route-level screens
 ├── context/      # Auth & global app state
 ├── services/     # API calls only
 ├── config/       # RBAC rules, constants
 ├── hooks/        # Custom reusable hooks
 ├── utils/        # Formatting, helpers
 └── data/         # Static reference data
```

Rules:
- Pages orchestrate
- Components render
- Services talk to backend
- Utils do not call APIs

---

## 6. State Management Rules

### 6.1 Global State (Context)
Allowed:
- Auth user
- Role & permissions
- App‑level settings

Avoid:
- Storing form data globally
- Duplicating backend state unnecessarily

### 6.2 Local State
- Forms, modals, filters
- Temporary UI state

---

## 7. Forms & Data Entry Guidelines

### 7.1 Form Behavior
- Always validate before submit
- Disable submit while loading
- Show field‑level errors

### 7.2 Critical Forms
Billing, expiry actions, overrides:
- Require confirmation modals
- Display irreversible warnings
- Log intent visibly ("This action will be audited")

---

## 8. Tables, Lists & Search

### 8.1 Tables
- Use pagination for large datasets
- Fixed column widths for POS
- Highlight critical states (expired, low stock)

### 8.2 Search
- Debounced search inputs
- Results sorted by relevance
- No blocking spinners for search

---

## 9. Error Handling Standards

### 9.1 API Errors
- Always show backend error messages
- Never swallow errors
- Use consistent error UI component

### 9.2 Edge Cases
- Network failure
- Session expired
- Permission revoked mid‑session

User must **always know what happened**.

---

## 10. Security‑Sensitive UI Rules

- Never expose internal IDs unnecessarily
- Do not store JWTs in localStorage
- Do not trust frontend validation
- Mask sensitive data when possible

Expired medicine UI must:
- Visibly block sale
- Clearly explain why
- Provide override path (if permitted)

---

## 11. Accessibility & Usability

- High contrast for alerts
- Clear color coding (no color‑only meaning)
- Large clickable targets for POS
- Readable font sizes (minimum 14px)

---

## 12. Performance Guidelines

- Lazy load non‑critical pages
- Memoize heavy tables
- Avoid unnecessary re‑renders
- Keep billing UI under 300ms response perception

---

## 13. UI Consistency Rules

- One button style per action type:
  - Primary: confirm / save
  - Secondary: cancel
  - Danger: delete / dispose

- Consistent date & currency formatting
- Consistent status labels across app

---

## 14. What NOT To Do

❌ Business logic in components
❌ Hidden side effects on click
❌ Silent auto‑saves
❌ Fancy animations on billing screens
❌ Frontend‑only security assumptions

---

## 15. Frontend Definition of Done (DoD)

A frontend feature is DONE only if:
- Role access enforced
- Errors handled and visible
- Loading states implemented
- Works with keyboard
- Does not slow billing flow

---

## Final Note (Cold Truth)

A Pharmacy UI is **not a startup landing page**.
It is an **operational tool under pressure**.

If the cashier hesitates, the UI failed.

