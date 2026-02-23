# Product Requirements Document (PRD)

## Product Name
**Pharmacy Management System (PMS)**

## Document Purpose
This PRD defines the functional, non-functional, and operational requirements for the Pharmacy Management System. It serves as a single source of truth for product scope, behavior, constraints, and success criteria. This document is suitable for academic defense, internal product alignment, and real-world production planning.

---

## 1. Product Vision

### Vision Statement
Build a **production-grade, regulation-aware Pharmacy Management System** that enables fast billing, accurate inventory control, strong auditability, and operational reliability for real pharmacies—not demos.

### Key Principles
- **Speed at the counter** (cashier-first design)
- **Safety over convenience** for medicines and expiry handling
- **Auditability by default** (every critical action is traceable)
- **Ops-ready** (backup, health, readiness, compliance)

---

## 2. Goals and Objectives

### Business Goals
- Reduce billing time per customer
- Prevent expired or incorrect medicine sales
- Provide transparent accountability for staff actions
- Enable owners/admins to operate with confidence

### Product Objectives
- End-to-end pharmacy workflow coverage
- Role-based separation of duties
- Batch- and expiry-aware inventory
- Compliance-aligned billing and reporting
- Production-safe operations and recovery

---

## 3. Stakeholders

| Role | Responsibility |
|----|----|
| Pharmacy Owner | Business oversight, compliance, reporting |
| Admin | System control, users, audits, ops |
| Pharmacist | Medicine validation, expiry handling |
| Cashier | Billing and customer transactions |
| System Operator | Deployment, backup, recovery |

---

## 4. User Roles & Permissions

### Defined Roles
- **Admin** – Full system access, ops, overrides
- **Pharmacist** – Inventory, expiry actions, prescription verification
- **Cashier** – Billing and POS operations
- **User** – Limited read-only or auxiliary access

### RBAC Requirements
- Action-level permission enforcement
- Frontend + backend parity
- Unauthorized actions must be blocked server-side
- RBAC policies must be auditable and configurable

---

## 5. Functional Requirements

### 5.1 Authentication & Session Management

**Requirements**
- Secure login/logout
- Cookie-based authenticated sessions
- Profile update and password change
- Admin login separated from regular users
- Login event capture for audits

**Acceptance Criteria**
- Sessions expire correctly
- Invalid credentials are rate-limited
- All logins are visible to admin

---

### 5.2 Medicine Master & Inventory

**Core Features**
- Medicine CRUD
- SKU, barcode, rack, manufacturer metadata
- Reorder thresholds
- Batch-level stock tracking
- Expiry lifecycle management

**Expiry Actions**
- none
- return_to_supplier
- clearance
- quarantine
- disposed

**Acceptance Criteria**
- Expired medicines cannot be sold without override
- Batch-level stock accuracy is preserved
- All expiry actions are logged

---

### 5.3 Billing / POS

**Core Features**
- Fast medicine search
- Line-item billing
- Discounts and VAT
- Bill draft and finalization
- IRD-style bill numbering
- End-of-day summaries

**Special Controls**
- Prescription verification workflow
- Admin-only expired override tokens

**Acceptance Criteria**
- Bill totals are consistent and auditable
- Overrides require admin authorization
- Finalized bills cannot be silently modified

---

### 5.4 Purchases & Supplier Ledger

**Core Features**
- Purchase order creation
- GRN receiving and stock update
- Supplier payments and dues
- Supplier ledger with export

**Acceptance Criteria**
- GRN updates inventory atomically
- Supplier balances are accurate
- Ledger exports match database totals

---

### 5.5 Dashboard, Reports & Alerts

**Dashboards**
- Sales performance
- Procurement trends
- Inventory health

**Alerts**
- Low stock
- Near-expiry
- Expired stock

**Acceptance Criteria**
- Alerts are actionable and role-aware
- Reports support filtering and export

---

### 5.6 Admin & Operations

**Admin Capabilities**
- User lifecycle management
- Login and audit log visibility
- Release readiness checks
- Compliance report execution

**Ops Features**
- Backup export / validate / import
- Health and readiness endpoints
- Ops metrics exposure

**Acceptance Criteria**
- Backups are restorable
- Readiness gates block unsafe releases
- All admin actions are logged

---

## 6. API & System Architecture

### Architecture Style
- Modular REST API
- Stateless backend services
- Secure cookie-based auth

### Runtime Guarantees
- Environment validation on boot
- MongoDB connectivity checks
- Admin bootstrap from env
- Health and readiness endpoints

---

## 7. Non-Functional Requirements

### Performance
- Billing search latency < 300ms (local DB)
- Bill finalization < 1s

### Security
- JWT authentication
- RBAC enforcement
- CSRF origin protection
- CORS allowlist
- Rate limiting on sensitive routes

### Reliability
- Graceful startup failure
- Idempotent ops scripts
- Backup integrity checks

### Maintainability
- Clear folder structure
- Service separation
- Scripted audits and migrations

---

## 8. Compliance & Auditability

**Requirements**
- Immutable bill numbering
- Tokenized expired overrides
- Full action audit logs
- Exportable compliance reports

**Acceptance Criteria**
- Every critical action is traceable
- Audit logs cannot be tampered with

---

## 9. Operational Requirements

### Deployment
- Environment-based configuration
- Pre-flight readiness checks

### Backup & Recovery
- Scheduled backups
- Manual snapshot capability
- Restore validation

### Monitoring
- Health endpoint monitoring
- Ops metrics exposure

---

## 10. Out of Scope (Current Phase)

- Multi-tenant SaaS billing
- Cloud-hosted POS hardware integration
- Insurance claim processing
- Mobile app client

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|----|----|
| Data loss | Automated backups + validation |
| Expired medicine sale | Hard expiry enforcement + overrides |
| Privilege misuse | RBAC + audit logs |
| Ops misconfiguration | Release readiness gates |

---

## 12. Success Metrics

- Billing time per customer
- Inventory discrepancy rate
- Expired stock incidents
- Successful backup restores
- Audit completeness

---

## 13. Future Enhancements

- Multi-pharmacy tenancy
- Barcode scanner integration
- Advanced analytics
- E-invoicing gateway integration
- Mobile cashier mode

---

## 14. Approval

This PRD represents the agreed functional and operational scope of the Pharmacy Management System for its current production phase.

