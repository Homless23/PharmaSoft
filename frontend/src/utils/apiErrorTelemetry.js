const MAX_RECENT_EVENTS = 200;
const MAX_SAMPLE_PER_CODE = 5;
const STORE_KEY = '__PMS_API_ERROR_TELEMETRY__';
const DEV_ONLY = process.env.NODE_ENV !== 'production';

const toSafeString = (value) => String(value || '').trim();

const getCodeKey = ({ code, status }) => {
  const safeCode = toSafeString(code);
  if (safeCode) return safeCode;
  const safeStatus = Number(status || 0);
  if (safeStatus) return `HTTP_${safeStatus}`;
  return 'UNKNOWN';
};

const ensureStore = () => {
  if (!DEV_ONLY || typeof window === 'undefined') return null;
  if (!window[STORE_KEY]) {
    window[STORE_KEY] = {
      byCode: {},
      recent: [],
      installed: false
    };
  }
  return window[STORE_KEY];
};

export const recordApiErrorTelemetry = (normalizedError = {}, rawError = {}) => {
  const store = ensureStore();
  if (!store) return;

  const codeKey = getCodeKey(normalizedError);
  const timestamp = new Date().toISOString();
  const message = toSafeString(normalizedError.message || rawError?.message || 'Unknown API error');
  const status = Number(normalizedError.status || rawError?.response?.status || 0) || 0;
  const method = toSafeString(rawError?.config?.method || '').toUpperCase();
  const url = toSafeString(rawError?.config?.url || rawError?.config?.baseURL || '');

  const bucket = store.byCode[codeKey] || {
    count: 0,
    lastAt: '',
    lastMessage: '',
    lastStatus: 0,
    samples: []
  };
  bucket.count += 1;
  bucket.lastAt = timestamp;
  bucket.lastMessage = message;
  bucket.lastStatus = status;
  if (bucket.samples.length < MAX_SAMPLE_PER_CODE) {
    bucket.samples.push({ at: timestamp, method, url, message, status });
  }
  store.byCode[codeKey] = bucket;

  store.recent.unshift({ code: codeKey, at: timestamp, method, url, message, status });
  if (store.recent.length > MAX_RECENT_EVENTS) {
    store.recent.length = MAX_RECENT_EVENTS;
  }
};

export const installApiErrorTelemetryConsole = () => {
  const store = ensureStore();
  if (!store || store.installed) return;

  const api = {
    summary() {
      const rows = Object.entries(store.byCode)
        .map(([code, meta]) => ({
          code,
          count: Number(meta?.count || 0),
          status: Number(meta?.lastStatus || 0) || '-',
          lastAt: meta?.lastAt || '-',
          lastMessage: meta?.lastMessage || '-'
        }))
        .sort((a, b) => b.count - a.count);
      return rows;
    },
    recent(limit = 20) {
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
      return store.recent.slice(0, safeLimit);
    },
    clear() {
      store.byCode = {};
      store.recent = [];
      return true;
    }
  };

  window.pmsApiErrors = api;
  store.installed = true;
  // One-time help for developers; ignored in production by DEV_ONLY guard.
  // eslint-disable-next-line no-console
  console.info('API error telemetry enabled. Use window.pmsApiErrors.summary() / recent() / clear()');
};

