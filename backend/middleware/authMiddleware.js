const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hasPermission, normalizeRole } = require('../config/rbacPolicy');
const { sendError } = require('../utils/apiResponse');
const TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies[TOKEN_COOKIE_NAME]) {
        token = req.cookies[TOKEN_COOKIE_NAME];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return sendError(res, 401, 'Not authorized', 'AUTH_USER_NOT_FOUND');
            }
            const decodedTokenVersion = Number(decoded?.tokenVersion || 0);
            const currentTokenVersion = Number(req.user?.tokenVersion || 0);
            if (decodedTokenVersion !== currentTokenVersion) {
                return sendError(res, 401, 'Not authorized', 'AUTH_TOKEN_INVALIDATED');
            }

            return next();
        } catch (error) {
            console.log(error);
            return sendError(res, 401, 'Not authorized', 'AUTH_TOKEN_INVALID');
        }
    }

    return sendError(res, 401, 'Not authorized, no token', 'AUTH_TOKEN_MISSING');
}

const adminOnly = (req, res, next) => {
    if (!req.user || normalizeRole(req.user.role) !== 'admin') {
        return sendError(res, 403, 'Admin access required', 'ADMIN_REQUIRED');
    }
    return next();
};

const allowRoles = (...roles) => {
    const allowedRoles = new Set((roles || []).map((role) => String(role || '').trim().toLowerCase()).filter(Boolean));
    return (req, res, next) => {
        const role = normalizeRole(req.user?.role);
        if (!req.user || !allowedRoles.has(role)) {
            return sendError(res, 403, 'Access denied for this role', 'ROLE_FORBIDDEN');
        }
        return next();
    };
};

const allowAction = (action) => {
    const normalizedAction = String(action || '').trim();
    return (req, res, next) => {
        const role = normalizeRole(req.user?.role);
        if (!req.user || !hasPermission(role, normalizedAction)) {
            return sendError(res, 403, 'Access denied for this action', 'ACTION_FORBIDDEN');
        }
        return next();
    };
};

module.exports = { protect, adminOnly, allowRoles, allowAction };
