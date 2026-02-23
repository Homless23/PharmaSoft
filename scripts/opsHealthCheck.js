const axios = require('axios');

const API_BASE = String(process.env.OPS_API_BASE || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const TIMEOUT_MS = Math.max(Number(process.env.OPS_HEALTH_TIMEOUT_MS || 5000), 1000);

const probe = async (path) => {
    const started = Date.now();
    try {
        const res = await axios.get(`${API_BASE}${path}`, { timeout: TIMEOUT_MS });
        return {
            path,
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            latencyMs: Date.now() - started,
            body: res.data || null
        };
    } catch (error) {
        return {
            path,
            ok: false,
            status: Number(error?.response?.status || 0),
            latencyMs: Date.now() - started,
            body: error?.response?.data || null,
            message: String(error?.message || 'Health probe failed')
        };
    }
};

const main = async () => {
    const [health, ready] = await Promise.all([
        probe('/health'),
        probe('/ready')
    ]);
    const summary = {
        apiBase: API_BASE,
        timestamp: new Date().toISOString(),
        health,
        ready
    };

    console.log('Ops health check summary:');
    console.log(summary);

    if (!health.ok || !ready.ok) {
        process.exitCode = 2;
    }
};

main().catch((error) => {
    console.error('opsHealthCheck failed:', error.message);
    process.exit(1);
});

