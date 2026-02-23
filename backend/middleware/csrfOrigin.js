const { sendError } = require('../utils/apiResponse');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';

const toOrigin = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        return new URL(raw).origin;
    } catch (error) {
        return '';
    }
};

const toOriginSet = (value) => new Set(
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => toOrigin(item) || item)
        .filter(Boolean)
);

const buildTrustedOriginSet = () => {
    const fromCors = toOriginSet(process.env.CORS_ORIGINS || 'http://localhost:3000');
    const fromCsrf = toOriginSet(process.env.CSRF_TRUSTED_ORIGINS || '');
    return new Set([...fromCors, ...fromCsrf]);
};

const trustedOrigins = buildTrustedOriginSet();

const getRequestOrigin = (req) => {
    const explicitOrigin = toOrigin(req.get('origin'));
    if (explicitOrigin) return explicitOrigin;
    const refererOrigin = toOrigin(req.get('referer'));
    if (refererOrigin) return refererOrigin;
    return '';
};

const csrfOriginProtection = (req, res, next) => {
    const method = String(req.method || '').toUpperCase();
    if (SAFE_METHODS.has(method)) return next();

    // Enforce origin protection only on cookie-based auth flows.
    const hasSessionCookie = Boolean(req.cookies?.[TOKEN_COOKIE_NAME]);
    if (!hasSessionCookie) return next();

    const requestOrigin = getRequestOrigin(req);
    if (!requestOrigin) {
        return sendError(res, 403, 'Missing request origin for state-changing cookie request', 'CSRF_ORIGIN_MISSING');
    }
    if (!trustedOrigins.has(requestOrigin)) {
        return sendError(res, 403, 'Untrusted request origin', 'CSRF_ORIGIN_FORBIDDEN', {
            origin: requestOrigin
        });
    }
    return next();
};

module.exports = {
    csrfOriginProtection
};

