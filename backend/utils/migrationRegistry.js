const os = require('os');
const MigrationRun = require('../models/MigrationRun');

const recordMigrationRun = async ({
    scriptName,
    mode = 'dry-run',
    applied = false,
    summary = {},
    startedAt = new Date(),
    finishedAt = new Date()
} = {}) => {
    const safeScriptName = String(scriptName || '').trim();
    if (!safeScriptName) return null;

    return MigrationRun.create({
        scriptName: safeScriptName,
        mode: String(mode || 'dry-run').trim().toLowerCase() === 'apply' ? 'apply' : 'dry-run',
        applied: Boolean(applied),
        summary: summary || {},
        startedAt,
        finishedAt,
        executedBy: String(process.env.USERNAME || process.env.USER || 'unknown'),
        host: String(os.hostname() || '')
    });
};

module.exports = {
    recordMigrationRun
};

