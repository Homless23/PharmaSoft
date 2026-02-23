export const ACTIONS = Object.freeze({
  MEDICINE_VIEW: 'medicine.view',
  MEDICINE_WRITE: 'medicine.write',
  MEDICINE_DELETE: 'medicine.delete',
  STOCK_MANAGE: 'stock.manage',
  BILLING_ACCESS: 'billing.access',
  BILLING_DELETE: 'billing.delete',
  PRESCRIPTION_VERIFY: 'prescription.verify',
  REPORTS_VIEW_PROFIT: 'reports.view.profit',
  TRANSACTIONS_MANAGE: 'transactions.manage',
  TRANSACTIONS_DELETE: 'transactions.delete',
  BUDGETS_MANAGE: 'budgets.manage',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  SETTINGS_MANAGE: 'settings.manage',
  BACKUP_MANAGE: 'backup.manage'
});

const ROLE_PERMISSIONS = Object.freeze({
  admin: new Set(Object.values(ACTIONS)),
  pharmacist: new Set([
    ACTIONS.MEDICINE_VIEW,
    ACTIONS.MEDICINE_WRITE,
    ACTIONS.STOCK_MANAGE,
    ACTIONS.BILLING_ACCESS,
    ACTIONS.PRESCRIPTION_VERIFY,
    ACTIONS.TRANSACTIONS_MANAGE,
    ACTIONS.BUDGETS_MANAGE
  ]),
  cashier: new Set([
    ACTIONS.MEDICINE_VIEW,
    ACTIONS.BILLING_ACCESS
  ]),
  user: new Set([
    ACTIONS.MEDICINE_VIEW
  ])
});

export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const hasPermission = (role, action) => {
  const normalizedRole = normalizeRole(role);
  const normalizedAction = String(action || '').trim();
  if (!normalizedAction) return false;
  return Boolean(ROLE_PERMISSIONS[normalizedRole]?.has(normalizedAction));
};
