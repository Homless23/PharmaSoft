// App-wide constants

export const TRANSACTION_CATEGORIES = [
  'Food',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Housing',
  'Utilities',
  'Stationary',
  'Other'
];

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

export const ALERT_TYPES = {
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info'
};

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

export const TOKEN_EXPIRY = '7d';
export const JWT_EXPIRY_HOURS = 168; // 7 days

export const PASSWORD_MIN_LENGTH = 6;
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;

export const API_ENDPOINTS = {
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/me',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_UPDATE_DETAILS: '/auth/updatedetails',
  AUTH_UPDATE_PASSWORD: '/auth/updatepassword',
  
  TRANSACTIONS_GET: '/transactions',
  TRANSACTIONS_ADD: '/transactions',
  TRANSACTIONS_DELETE: '/transactions/:id',
  TRANSACTIONS_UPDATE: '/transactions/:id',
  
  BUDGET_GET: '/budget',
  BUDGET_UPDATE: '/budget',
};
