# Pharmacy Management System (PMS)
## App Flow, Technical Stack, Frontend Guidelines, Backend Schema & Implementation Plan

---

## 1. Application Flow (End-to-End)

### 1.1 User Entry Flow

```
User → Login Page
        ├── Invalid credentials → Error + Rate Limit
        └── Valid credentials
              ↓
        Fetch /auth/me
              ↓
        RBAC Policy Loaded
              ↓
        Role-based Dashboard
```

---

### 1.2 Role-Based Navigation Flow

#### Admin Flow
```
Dashboard
 ├── User Management
 ├── Audit Logs & Logins
 ├── Ops & Readiness
 ├── Backup & Restore
 ├── Settings
 └── Reports & Analytics
```

#### Pharmacist Flow
```
Dashboard
 ├── Medicine Master
 ├── Inventory & Batches
 ├── Expiry Actions
 ├── Prescription Verification
 └── Reports
```

#### Cashier Flow (Critical Path)
```
Dashboard
 └── Billing / POS
       ├── Medicine Search
       ├── Cart Build
       ├── Discount / VAT
       ├── Prescription Check
       ├── Bill Finalize
       └── Print / Save
```

---

### 1.3 Inventory Lifecycle Flow

```
Purchase Order
   ↓
GRN Receive
   ↓
Batch Created
   ↓
Available Stock
   ↓
Near Expiry
   ├── Clearance
   ├── Return to Supplier
   ├── Quarantine
   └── Dispose
```

Expired stock **cannot enter billing** unless admin override token is applied.

---

## 2. Technical Stack

### 2.1 Frontend
- **Framework**: React
- **UI Library**: Ant Design
- **State Management**: React Context API
- **Routing**: React Router
- **API Client**: Axios (`withCredentials: true`)
- **Build Tooling**: CRA / Vite (as configured)

### 2.2 Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT (HTTP-only cookies)
- **Authorization**: RBAC middleware
- **ORM/ODM**: Mongoose
- **Validation**: Schema + middleware checks

### 2.3 Database
- **Primary DB**: MongoDB
- **Data Model Style**: Relational-style documents with references

### 2.4 Ops & Tooling
- Backup scripts
- Audit scripts
- Readiness & compliance gates
- Structured logging with request IDs

---

## 3. Frontend Engineering Guidelines

### 3.1 Design Principles
- Cashier screens optimized for **speed over beauty**
- Minimal modal depth (max 2 levels)
- Keyboard-friendly workflows
- Clear error states (no silent failures)

---

### 3.2 Folder-Level Responsibilities

```
components/  → Reusable UI blocks
pages/       → Route-level views
context/     → Global auth & app state
services/    → API calls only (no logic)
config/      → RBAC and constants
data/        → Static medicine/NLEM data
```

---

### 3.3 Frontend Rules (Non-Negotiable)
- **No business logic in UI components**
- All permission checks duplicated server-side
- API errors must be surfaced to the user
- Date/expiry formatting standardized
- All destructive actions require confirmation

---

## 4. Backend Data Schema (High-Level)

### 4.1 User Schema
```js
User {
  _id
  name
  email
  passwordHash
  role
  isActive
  lastLoginAt
  createdAt
}
```

---

### 4.2 Medicine Schema
```js
Medicine {
  _id
  name
  sku
  barcode
  manufacturer
  rackLocation
  reorderLevel
  createdAt
}
```

---

### 4.3 Batch / Inventory Schema
```js
Batch {
  _id
  medicineId
  batchNumber
  expiryDate
  quantity
  expiryStatus
  createdAt
}
```

---

### 4.4 Bill Schema
```js
Bill {
  _id
  billNumber
  items[]
  subtotal
  vat
  discount
  total
  finalizedBy
  prescriptionVerified
  createdAt
}
```

---

### 4.5 Purchase & Supplier Schema
```js
Purchase {
  _id
  supplierId
  items[]
  totalAmount
  paymentStatus
  createdAt
}

Supplier {
  _id
  name
  contactInfo
  balance
}
```

---

### 4.6 Audit Log Schema
```js
AuditLog {
  _id
  actorId
  action
  entityType
  entityId
  metadata
  timestamp
}
```

---

## 5. Backend Architecture Guidelines

### Mandatory Rules
- Controllers handle **HTTP only**
- Services handle **business logic**
- Models contain **no logic beyond schema hooks**
- Middleware enforces auth, RBAC, validation

---

## 6. Implementation Plan

### Phase 1 – Foundation (Completed)
- Auth & RBAC
- Core schemas
- Billing flow
- Inventory & batch logic

---

### Phase 2 – Operations & Compliance (Completed)
- Audit logging
- Backup & restore
- Health & readiness checks
- Admin ops endpoints

---

### Phase 3 – Stabilization (Recommended)
- Edge-case handling (partial GRN, failed finalize)
- Load testing billing endpoints
- UI performance tuning

---

### Phase 4 – Enhancements (Future)
- Multi-tenant support
- Barcode scanner integration
- Advanced analytics
- Mobile POS mode

---

## 7. Risks & Technical Decisions

| Area | Decision | Reason |
|----|----|----|
| Auth | Cookie JWT | POS-friendly, secure |
| DB | MongoDB | Flexible schema for batches |
| RBAC | Action-based | Prevent privilege abuse |
| Ops | Script-driven | Predictable recovery |

---

## 8. Definition of Done (DoD)

A feature is considered **DONE** only if:
- RBAC enforced
- Audit log recorded
- Error paths handled
- Tested manually via real workflow
- Does not break billing speed

---

## 9. Final Note (Real Talk)

This PMS is already **beyond most academic projects**.
Your risk is **underselling it**, not overengineering it.

If you want, next I can:
- Create **sequence diagrams** (billing, GRN, override)
- Map **PRD → API → DB → UI traceability**
- Prepare **defense answers with diagrams**

