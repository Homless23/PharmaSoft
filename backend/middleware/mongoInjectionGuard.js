const { sendError } = require('../utils/apiResponse');

const BLOCKED_EXACT_KEYS = new Set(['$gt', '$ne', '$where', '$regex']);

const hasBlockedKey = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) {
        return value.some((item) => hasBlockedKey(item));
    }
    const entries = Object.entries(value);
    for (const [key, nested] of entries) {
        const lowered = String(key || '').trim().toLowerCase();
        if (BLOCKED_EXACT_KEYS.has(lowered)) return true;
        if (lowered.startsWith('$')) return true;
        if (lowered.includes('.')) return true;
        if (hasBlockedKey(nested)) return true;
    }
    return false;
};

const mongoInjectionGuard = (req, res, next) => {
    if (hasBlockedKey(req.body) || hasBlockedKey(req.query) || hasBlockedKey(req.params)) {
        return sendError(res, 400, 'Malformed request payload', 'REQUEST_PAYLOAD_INVALID');
    }
    return next();
};

module.exports = { mongoInjectionGuard };
