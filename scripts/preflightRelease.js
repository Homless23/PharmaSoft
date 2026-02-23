const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const run = (label, command, args, cwd) => {
    console.log(`\n[preflight] ${label}`);
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    if (result.status !== 0) {
        throw new Error(`${label} failed`);
    }
};

const requireFile = (label, filepath) => {
    if (!fs.existsSync(filepath)) {
        throw new Error(`[preflight] Missing required file: ${label} (${filepath})`);
    }
    console.log(`[preflight] OK file: ${label}`);
};

const main = () => {
    console.log('[preflight] Starting release checks');

    requireFile('backend/.env', path.join(backendDir, '.env'));
    requireFile('frontend/.env.example', path.join(frontendDir, '.env.example'));
    requireFile('backend/.env.example', path.join(backendDir, '.env.example'));

    run('Backend syntax check (server)', 'node', ['--check', 'server.js'], backendDir);
    run('Backend syntax check (billing)', 'node', ['--check', 'controllers/billController.js'], backendDir);
    run('Backend syntax check (admin)', 'node', ['--check', 'controllers/adminController.js'], backendDir);
    run('Frontend production build', 'npm', ['run', 'build'], frontendDir);

    console.log('\n[preflight] All release checks passed');
};

try {
    main();
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}

