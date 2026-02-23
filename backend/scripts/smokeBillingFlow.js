const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = String(process.env.SMOKE_API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '');
const SMOKE_EMAIL = String(process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const SMOKE_PASSWORD = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();

const fail = (message) => {
    throw new Error(message);
};

const buildCookieHeader = (setCookieHeaders = []) => {
    return (setCookieHeaders || [])
        .map((header) => String(header || '').split(';')[0])
        .filter(Boolean)
        .join('; ');
};

const httpJson = async (url, { method = 'GET', body, cookie = '' } = {}) => {
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {})
        },
        body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (_error) {
        payload = null;
    }
    return { response, payload };
};

const pickBillableMedicine = (categories = []) => {
    const candidates = (categories || []).filter((item) => Number(item?.stockQty || 0) > 0);
    return candidates[0] || null;
};

const main = async () => {
    if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
        fail('SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD (or ADMIN_EMAIL/ADMIN_PASSWORD) are required');
    }

    const loginResult = await httpJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: SMOKE_EMAIL, password: SMOKE_PASSWORD }
    });
    if (!loginResult.response.ok) {
        fail(`Login failed (${loginResult.response.status}): ${loginResult.payload?.message || 'unknown error'}`);
    }
    const setCookie = loginResult.response.headers.getSetCookie?.() || [];
    const cookieHeader = buildCookieHeader(setCookie);
    if (!cookieHeader) {
        fail('Login succeeded but no auth cookie was returned');
    }

    const categoriesResult = await httpJson(`${API_BASE}/v1/categories`, { cookie: cookieHeader });
    if (!categoriesResult.response.ok) {
        fail(`Failed to fetch categories (${categoriesResult.response.status})`);
    }
    const categories = Array.isArray(categoriesResult.payload) ? categoriesResult.payload : [];
    const medicine = pickBillableMedicine(categories);
    if (!medicine) {
        fail('No billable medicine found (need at least one item with stockQty > 0)');
    }

    const beforeStock = Number(medicine.stockQty || 0);
    const billDate = new Date().toISOString().slice(0, 10);
    const qty = 1;
    const rate = Math.max(Number(medicine.unitPrice || 0), 1);
    const clientRequestId = `SMOKE-${Date.now()}`;
    const finalizeResult = await httpJson(`${API_BASE}/v1/bills/finalize`, {
        method: 'POST',
        cookie: cookieHeader,
        body: {
            clientRequestId,
            billDate,
            customerName: 'Smoke Test Customer',
            paymentMethod: 'cash',
            prescriptionRecord: { mode: 'none' },
            items: [{
                medicineId: medicine._id,
                medicineName: medicine.name,
                batchNumber: String(medicine.batchNumber || ''),
                qty,
                rate,
                amount: Number((qty * rate).toFixed(2))
            }],
            vatApplicable: true
        }
    });
    if (!finalizeResult.response.ok) {
        fail(`Bill finalize failed (${finalizeResult.response.status}): ${finalizeResult.payload?.message || 'unknown error'}`);
    }
    const createdBill = finalizeResult.payload?.bill;
    if (!createdBill?._id) {
        fail('Finalize response did not return a bill id');
    }

    const afterFinalizeCategories = await httpJson(`${API_BASE}/v1/categories`, { cookie: cookieHeader });
    if (!afterFinalizeCategories.response.ok) {
        fail(`Failed to refetch categories after finalize (${afterFinalizeCategories.response.status})`);
    }
    const medicineAfterFinalize = (afterFinalizeCategories.payload || []).find((item) => String(item?._id) === String(medicine._id));
    const stockAfterFinalize = Number(medicineAfterFinalize?.stockQty || 0);
    if (!(stockAfterFinalize <= beforeStock - qty)) {
        fail(`Stock was not deducted after finalize. before=${beforeStock} after=${stockAfterFinalize}`);
    }

    const voidResult = await httpJson(`${API_BASE}/v1/bills/${createdBill._id}`, {
        method: 'DELETE',
        cookie: cookieHeader,
        body: { reason: 'Smoke test rollback' }
    });
    if (!voidResult.response.ok) {
        fail(`Bill void failed (${voidResult.response.status}): ${voidResult.payload?.message || 'unknown error'}`);
    }

    const afterVoidCategories = await httpJson(`${API_BASE}/v1/categories`, { cookie: cookieHeader });
    if (!afterVoidCategories.response.ok) {
        fail(`Failed to refetch categories after void (${afterVoidCategories.response.status})`);
    }
    const medicineAfterVoid = (afterVoidCategories.payload || []).find((item) => String(item?._id) === String(medicine._id));
    const stockAfterVoid = Number(medicineAfterVoid?.stockQty || 0);
    if (stockAfterVoid < beforeStock) {
        fail(`Stock restore check failed after void. before=${beforeStock} afterVoid=${stockAfterVoid}`);
    }

    console.log('Billing smoke test passed');
    console.log(JSON.stringify({
        medicineId: String(medicine._id),
        billId: String(createdBill._id),
        beforeStock,
        stockAfterFinalize,
        stockAfterVoid
    }, null, 2));
};

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

