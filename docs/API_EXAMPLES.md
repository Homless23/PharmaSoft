# API Examples

Base URL (local): `http://localhost:5000/api`

All protected routes require auth cookie (`withCredentials: true` in frontend Axios).

## 1. Authentication

### Register
`POST /auth/register`

Request:
```json
{
  "name": "Owner Admin",
  "email": "owner@example.com",
  "password": "StrongPass#123",
  "confirmPassword": "StrongPass#123"
}
```

Response:
```json
{
  "_id": "65f9b6d4e1b8d6502f7fdd11",
  "name": "Owner Admin",
  "email": "owner@example.com",
  "role": "user"
}
```

### Login
`POST /auth/login`

Request:
```json
{
  "email": "owner@example.com",
  "password": "StrongPass#123"
}
```

Response:
```json
{
  "_id": "65f9b6d4e1b8d6502f7fdd11",
  "name": "Owner Admin",
  "email": "owner@example.com",
  "role": "admin"
}
```

## 2. Medicine / Inventory

### Create medicine
`POST /v1/categories/add`

Request:
```json
{
  "name": "Cetirizine 10mg",
  "genericName": "Cetirizine",
  "strength": "10mg",
  "sku": "MED-CET-10",
  "barcode": "8901234567890",
  "rackLocation": "A-03",
  "manufacturer": "ABC Pharma",
  "unitPrice": 18,
  "stockQty": 150,
  "reorderPoint": 20,
  "prescriptionRequired": false,
  "regulatoryClass": "none",
  "batchNumber": "B-001",
  "expiryDate": "2027-12-31"
}
```

Response:
```json
{
  "_id": "6600ab91c5d67f2f2b619010",
  "name": "Cetirizine 10mg",
  "stockQty": 150,
  "unitPrice": 18
}
```

### Quick search
`GET /v1/categories/quick-search?q=cet&limit=8`

Response:
```json
[
  {
    "_id": "6600ab91c5d67f2f2b619010",
    "name": "Cetirizine 10mg",
    "unitPrice": 18,
    "stockQty": 150,
    "rackLocation": "A-03"
  }
]
```

### Stock-in
`POST /v1/categories/:id/stock-in`

Request:
```json
{
  "qty": 40,
  "batchNumber": "B-002",
  "expiryDate": "2028-01-15"
}
```

Response:
```json
{
  "message": "Stock-in successful"
}
```

### Stock-out
`POST /v1/categories/:id/stock-out`

Request:
```json
{
  "qty": 12
}
```

Response:
```json
{
  "message": "Stock-out successful"
}
```

## 3. Billing

### Finalize bill
`POST /v1/bills/finalize`

Request:
```json
{
  "clientRequestId": "REQ-1711100000000-abcd1234",
  "billDate": "2026-02-23",
  "customerName": "Walk-in",
  "customerPhone": "",
  "paymentMethod": "cash",
  "items": [
    {
      "medicineId": "6600ab91c5d67f2f2b619010",
      "medicineName": "Cetirizine 10mg",
      "batchNumber": "B-002",
      "qty": 2,
      "rate": 18
    }
  ],
  "vatApplicable": true,
  "taxPercent": 13,
  "discountPercent": 0
}
```

Response:
```json
{
  "bill": {
    "_id": "66011d9fc5d67f2f2b6190af",
    "billNumber": "IRD-2025-26-000123",
    "grandTotal": 40.68,
    "status": "finalized"
  }
}
```

### End-of-day report
`GET /v1/bills/end-of-day?date=2026-02-23`

Response:
```json
{
  "date": "2026-02-23",
  "bills": [],
  "summary": {
    "cash": 0,
    "digital": 0,
    "totalSales": 0
  }
}
```

## 4. Purchases

### Create purchase order
`POST /v1/purchases`

Request:
```json
{
  "supplierName": "ABC Wholesaler",
  "supplierInvoiceNumber": "INV-7781",
  "purchaseDate": "2026-02-23",
  "amountPaid": 2000,
  "notes": "Urgent restock",
  "items": [
    {
      "medicineId": "6600ab91c5d67f2f2b619010",
      "qty": 100,
      "costRate": 12,
      "batchNumber": "B-009",
      "expiryDate": "2028-02-28"
    }
  ]
}
```

Response:
```json
{
  "_id": "66012a9bc5d67f2f2b619153",
  "purchaseNumber": "PO-000045",
  "status": "draft"
}
```

### Receive GRN
`POST /v1/purchases/:id/receive`

Response:
```json
{
  "message": "Purchase received and stock updated"
}
```

## 5. Admin

### Create user
`POST /admin/users`

Request:
```json
{
  "name": "Cashier One",
  "email": "cashier1@example.com",
  "password": "StrongPass#123",
  "role": "cashier"
}
```

Response:
```json
{
  "_id": "6601398bc5d67f2f2b6191b0",
  "name": "Cashier One",
  "email": "cashier1@example.com",
  "role": "cashier"
}
```

### Ops metrics
`GET /admin/ops/metrics`

Response:
```json
{
  "timestamp": "2026-02-23T07:00:00.000Z",
  "uptimeSeconds": 12345,
  "db": { "isConnected": true },
  "warnings": []
}
```

## 6. Common Error Shape

```json
{
  "message": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "status": 400,
  "requestId": "uuid-or-request-id"
}
```
