const createIpRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 20,
    message = 'Too many requests. Please try again later.',
    code = 'RATE_LIMITED',
    keyBy = null
} = {}) => {
    const hits = new Map();

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        const scopedKey = typeof keyBy === 'function' ? String(keyBy(req) || '').trim() : '';
        const now = Date.now();
        const windowStart = now - windowMs;
        const key = scopedKey || String(ip);
        const entry = hits.get(key) || [];
        const active = entry.filter((ts) => ts > windowStart);

        if (active.length >= max) {
            if (String(req?.requestId || '')) {
                console.warn(`[${req.requestId}] rate limited key=${key} code=${code}`);
            }
            return res.status(429).json({
                message: String(message || 'Too many requests. Please try again later.'),
                code: String(code || 'RATE_LIMITED'),
                status: 429
            });
        }

        active.push(now);
        hits.set(key, active);
        return next();
    };
};

module.exports = { createIpRateLimiter };
