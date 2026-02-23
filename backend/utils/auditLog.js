const AuditLog = require('../models/AuditLog');

const normalizeIp = (req) => String(req?.ip || req?.headers?.['x-forwarded-for'] || '').trim();
const normalizeUserAgent = (req) => String(req?.get?.('user-agent') || '').trim();

const writeAuditLog = async ({
    req,
    userId = null,
    action,
    entityType,
    entityId = '',
    status = 'success',
    details = {}
}) => {
    try {
        if (!action || !entityType) return;
        await AuditLog.create({
            user: userId || null,
            action: String(action).trim(),
            entityType: String(entityType).trim(),
            entityId: String(entityId || '').trim(),
            status: status === 'failure' ? 'failure' : 'success',
            details: details && typeof details === 'object' ? details : {},
            ip: normalizeIp(req),
            userAgent: normalizeUserAgent(req)
        });
    } catch (error) {
        console.log('Failed to write audit log:', error.message);
    }
};

module.exports = { writeAuditLog };
