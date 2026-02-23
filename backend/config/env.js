const normalize = (value) => String(value || '').trim();

const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(value));
const splitCsv = (value) => normalize(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const validateEnvironment = (env = process.env) => {
    const errors = [];
    const warnings = [];
    const isProduction = normalize(env.NODE_ENV).toLowerCase() === 'production';

    if (!normalize(env.MONGO_URI)) {
        errors.push('MONGO_URI is required');
    }

    const jwtSecret = normalize(env.JWT_SECRET);
    if (!jwtSecret) {
        errors.push('JWT_SECRET is required');
    } else if (isProduction && jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters in production');
    } else if (!isProduction && jwtSecret.length < 16) {
        warnings.push('JWT_SECRET is short for non-production usage');
    }

    const corsOrigins = splitCsv(env.CORS_ORIGINS);
    if (!corsOrigins.length) {
        errors.push('CORS_ORIGINS must include at least one origin');
    }

    const csrfOrigins = splitCsv(env.CSRF_TRUSTED_ORIGINS || env.CORS_ORIGINS);
    if (!csrfOrigins.length) {
        errors.push('CSRF_TRUSTED_ORIGINS must include at least one trusted origin');
    }

    const backupSecret = normalize(env.BACKUP_SIGNING_SECRET);
    if (isProduction && !backupSecret) {
        errors.push('BACKUP_SIGNING_SECRET is required in production');
    }
    const backupEncryptionKey = normalize(env.BACKUP_EXPORT_ENCRYPTION_KEY);
    if (isProduction && !backupEncryptionKey) {
        errors.push('BACKUP_EXPORT_ENCRYPTION_KEY is required in production');
    } else if (!isProduction && !backupEncryptionKey) {
        warnings.push('BACKUP_EXPORT_ENCRYPTION_KEY is not set; encrypted backup export/import will fail');
    }

    const accessTokenTtlMinutes = Number(env.ACCESS_TOKEN_TTL_MINUTES || 15);
    if (!Number.isFinite(accessTokenTtlMinutes)) {
        errors.push('ACCESS_TOKEN_TTL_MINUTES must be a number');
    } else if (accessTokenTtlMinutes < 15 || accessTokenTtlMinutes > 30) {
        errors.push('ACCESS_TOKEN_TTL_MINUTES must be between 15 and 30');
    }

    const superAdminEmail = normalize(env.SUPER_ADMIN_EMAIL);
    if (isProduction) {
        if (!superAdminEmail) {
            errors.push('SUPER_ADMIN_EMAIL is required in production');
        } else if (!isLikelyEmail(superAdminEmail)) {
            errors.push('SUPER_ADMIN_EMAIL must be a valid email');
        }
    } else if (superAdminEmail && !isLikelyEmail(superAdminEmail)) {
        warnings.push('SUPER_ADMIN_EMAIL is set but not a valid email');
    }

    const adminEmail = normalize(env.ADMIN_EMAIL);
    const adminPassword = normalize(env.ADMIN_PASSWORD);
    if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
        errors.push('ADMIN_EMAIL and ADMIN_PASSWORD must be set together');
    }
    if (adminEmail && !isLikelyEmail(adminEmail)) {
        errors.push('ADMIN_EMAIL must be a valid email');
    }
    if (adminPassword && isProduction && adminPassword.length < 12) {
        errors.push('ADMIN_PASSWORD must be at least 12 characters in production');
    }

    return { isProduction, errors, warnings };
};

module.exports = { validateEnvironment };
