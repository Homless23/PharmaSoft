const sendError = (res, status, message, code = '', extra = {}) => {
    const safeStatus = Number(status) || 500;
    const payload = {
        message: String(message || 'Server Error'),
        code: String(code || '').trim(),
        status: safeStatus
    };
    return res.status(safeStatus).json({
        ...payload,
        ...(extra && typeof extra === 'object' ? extra : {})
    });
};

module.exports = {
    sendError
};

