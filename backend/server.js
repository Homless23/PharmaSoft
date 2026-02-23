const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const { connectDB, disconnectDB, getDbHealth } = require('./config/db');
const { validateEnvironment } = require('./config/env');
const { startBackupScheduler } = require('./services/backupScheduler');
const { csrfOriginProtection } = require('./middleware/csrfOrigin');
const { mongoInjectionGuard } = require('./middleware/mongoInjectionGuard');
const User = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const envCheck = validateEnvironment(process.env);
if (envCheck.warnings.length) {
    envCheck.warnings.forEach((warning) => {
        console.warn(`[env-warning] ${warning}`);
    });
}
if (envCheck.errors.length) {
    envCheck.errors.forEach((error) => {
        console.error(`[env-error] ${error}`);
    });
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = Math.max(Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 10000), 1000);
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Connect to Database
connectDB();

const ensureAdminUser = async () => {
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');
    const adminName = String(process.env.ADMIN_NAME || 'Admin').trim();
    const syncAdminPassword = String(process.env.ADMIN_SYNC_PASSWORD || 'true').toLowerCase() !== 'false';
    if (!adminEmail || !adminPassword) return;

    try {
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            let updated = false;
            if (existing.name !== adminName) {
                existing.name = adminName;
                updated = true;
            }
            if (existing.role !== 'admin') {
                existing.role = 'admin';
                updated = true;
            }
            if (!existing.ownerAdmin || String(existing.ownerAdmin) !== String(existing._id)) {
                existing.ownerAdmin = existing._id;
                updated = true;
            }
            if (syncAdminPassword) {
                existing.password = adminPassword;
                updated = true;
            }
            if (updated) {
                await existing.save();
                console.log('Admin user synchronized from environment');
            }
            return;
        }

        const createdAdmin = await User.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            ownerAdmin: null
        });
        createdAdmin.ownerAdmin = createdAdmin._id;
        await createdAdmin.save();
        console.log('Admin user bootstrapped from environment');
    } catch (error) {
        console.log('Failed to bootstrap admin user:', error.message);
    }
};

ensureAdminUser();

// Middleware
app.use(cookieParser());
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = String(requestId);
    res.setHeader('X-Request-Id', req.requestId);
    res.locals.startedAt = Date.now();
    return next();
});
morgan.token('request-id', (req) => req.requestId || '-');
app.use(morgan(':date[iso] :method :url :status :response-time ms req_id=:request-id', {
    skip: () => String(process.env.NODE_ENV).toLowerCase() === 'test'
}));
const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    credentials: true,
    origin(origin, callback) {
        // Allow server-to-server calls and same-origin requests with no Origin header.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'));
    }
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return next();
});

app.use(csrfOriginProtection);
app.use(mongoInjectionGuard);

const jsonLimit = (limit) => express.json({ limit });

// Health check endpoint for quick runtime verification
app.get('/api/health', (req, res) => {
    const dbHealth = getDbHealth();
    res.status(200).json({
        status: 'ok',
        db: dbHealth,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/ready', (req, res) => {
    const dbHealth = getDbHealth();
    if (!dbHealth.isConnected) {
        return res.status(503).json({
            status: 'not_ready',
            db: dbHealth,
            timestamp: new Date().toISOString()
        });
    }
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/e254e888-5e15-43e5-98ee-a55b63ba84d2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '33fdc1'
        },
        body: JSON.stringify({
            sessionId: '33fdc1',
            runId: 'pre-fix',
            hypothesisId: 'H1',
            location: 'server.js:149',
            message: 'ready_ok',
            data: {
                path: req.originalUrl,
                method: req.method,
                db: dbHealth
            },
            timestamp: Date.now()
        })
    }).catch(() => {});
    // #endregion agent log
    return res.status(200).json({
        status: 'ready',
        db: dbHealth,
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', jsonLimit('128kb'), require('./routes/auth'));
app.use('/api/admin', jsonLimit('128kb'), require('./routes/admin'));
app.use('/api', jsonLimit('64kb'), require('./routes/notifications'));
app.use('/api/v1', jsonLimit('256kb'), require('./routes/transactions')); // Keeps old endpoint URLs for compatibility
app.use('/api/v1', jsonLimit('256kb'), require('./routes/categoryRoutes'));
app.use('/api/v1', jsonLimit('256kb'), require('./routes/purchases'));
app.use('/api/v1', jsonLimit('128kb'), require('./routes/settings'));
app.use('/api/v1', jsonLimit('128kb'), require('./routes/goals'));
app.use('/api/v1', jsonLimit('128kb'), require('./routes/budgets'));
app.use('/api/v1', jsonLimit('2mb'), require('./routes/bills'));

app.use((req, res) => {
    return res.status(404).json({
        message: 'Endpoint not found',
        path: req.originalUrl,
        requestId: req.requestId || null
    });
});

app.use((err, req, res, next) => {
    if (err && String(err.message || '').includes('CORS policy')) {
        return res.status(403).json({
            message: 'Origin not allowed by CORS policy',
            code: 'CORS_ORIGIN_FORBIDDEN',
            status: 403,
            requestId: req.requestId || null
        });
    }
    const statusCode = Number(err?.status || err?.statusCode || 500);
    const responseMessage = statusCode >= 500
        ? 'Internal Server Error'
        : String(err?.message || 'Request failed');
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/e254e888-5e15-43e5-98ee-a55b63ba84d2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '33fdc1'
        },
        body: JSON.stringify({
            sessionId: '33fdc1',
            runId: 'pre-fix',
            hypothesisId: statusCode >= 500 ? 'H1_H5' : 'H2_H3',
            location: 'server.js:185',
            message: 'express_error',
            data: {
                path: req.originalUrl,
                method: req.method,
                statusCode,
                requestId: req.requestId || null,
                errorMessage: String(err?.message || ''),
                isCorsPolicy: !!(err && String(err.message || '').includes('CORS policy'))
            },
            timestamp: Date.now()
        })
    }).catch(() => {});
    // #endregion agent log
    if (statusCode >= 500) {
        console.error(`[${req.requestId || 'n/a'}]`, err);
    }
    return res.status(statusCode).json({
        message: responseMessage,
        requestId: req.requestId || null
    });
});

const server = http.createServer(app);
const stopBackupScheduler = startBackupScheduler();

server.listen(PORT, () => {
    console.log('You are listening to port:', PORT);
});

let isShuttingDown = false;
const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received. Starting graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    try {
        stopBackupScheduler();
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
        await disconnectDB();
        clearTimeout(forceExitTimer);
        console.log('Graceful shutdown complete.');
        process.exit(0);
    } catch (error) {
        clearTimeout(forceExitTimer);
        console.error('Shutdown failed:', error.message);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});
