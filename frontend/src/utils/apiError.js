const CODE_MESSAGE_MAP = {
  AUTH_RATE_LIMITED: 'Too many sign-in attempts. Please wait and try again.',
  ADMIN_AUTH_RATE_LIMITED: 'Too many admin sign-in attempts. Please wait and try again.',
  PASSWORD_RATE_LIMITED: 'Too many password changes. Please wait and try again.',
  ADMIN_WRITE_RATE_LIMITED: 'Too many admin updates right now. Please retry shortly.',
  BACKUP_IMPORT_RATE_LIMITED: 'Too many backup imports. Please wait before retrying.',
  BILL_FINALIZE_RATE_LIMITED: 'Too many bill finalizations. Please wait and retry.',
  OVERRIDE_TOKEN_RATE_LIMITED: 'Too many override token requests. Please wait and retry.',
  AUTH_LOGIN_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_ADMIN_INVALID_CREDENTIALS: 'Invalid admin credentials.',
  AUTH_USER_NOT_FOUND: 'User account was not found.',
  AUTH_TOKEN_MISSING: 'Session expired. Please sign in again.',
  AUTH_TOKEN_INVALID: 'Session expired. Please sign in again.',
  AUTH_TOKEN_INVALIDATED: 'Session expired due to security update. Please sign in again.',
  ACTION_FORBIDDEN: 'You do not have permission for this action.',
  ROLE_FORBIDDEN: 'Your role cannot perform this action.',
  ADMIN_REQUIRED: 'Admin access is required for this section.',
  BILL_DUPLICATE_INVOICE: 'Invoice number conflict. Please retry.',
  BILL_ITEMS_REQUIRED: 'Add at least one valid item before finalizing the bill.',
  STOCK_OUT_INSUFFICIENT: 'Insufficient stock in available batches.',
  PURCHASE_NOT_FOUND: 'Purchase record was not found.',
  PURCHASE_NUMBER_CONFLICT: 'Duplicate purchase number. Use a different purchase number.'
};

const toSafeString = (value) => String(value || '').trim();

export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  const status = Number(error?.response?.status || error?.response?.data?.status || 0) || 0;
  const code = toSafeString(error?.response?.data?.code || error?.code);
  const backendMessage = toSafeString(error?.response?.data?.message || error?.response?.data?.error);
  const validationMessage = Array.isArray(error?.response?.data?.errors) && error.response.data.errors[0]?.msg
    ? toSafeString(error.response.data.errors[0].msg)
    : '';
  const mappedByCode = code ? CODE_MESSAGE_MAP[code] : '';

  let message = mappedByCode || validationMessage || backendMessage || toSafeString(error?.message) || fallback;
  if (toSafeString(error?.code) === 'ERR_NETWORK') {
    message = 'Cannot reach backend API. Ensure backend is running on http://localhost:5000.';
  }

  return {
    message: toSafeString(message) || fallback,
    code,
    status
  };
};

export const getApiErrorMessage = (error, fallback) => getApiError(error, fallback).message;
