const { sendError } = require('../utils/apiResponse');

const normalizeKey = (key) => String(key || '').trim();

const allowOnlyBodyFields = (allowedFields = []) => {
    const allowed = new Set((allowedFields || []).map(normalizeKey).filter(Boolean));
    return (req, res, next) => {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return sendError(res, 400, 'Invalid request body', 'REQUEST_BODY_INVALID');
        }
        const keys = Object.keys(body);
        const unknown = keys.filter((key) => !allowed.has(normalizeKey(key)));
        if (unknown.length) {
            return sendError(res, 400, `Unknown fields: ${unknown.join(', ')}`, 'REQUEST_UNKNOWN_FIELDS');
        }
        return next();
    };
};

module.exports = { allowOnlyBodyFields };
