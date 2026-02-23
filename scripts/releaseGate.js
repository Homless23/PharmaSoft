const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const releaseStatusPath = path.join(backendDir, 'runtime', 'release-gate-status.json');

const hasFlag = (flag) => process.argv.includes(flag);

const runStep = ({ label, command, args, cwd, optional = false }) => {
    console.log(`\n[release-gate] ${label}`);
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    const code = Number(result?.status ?? 1);
    const ok = code === 0;
    if (ok) {
        console.log(`[release-gate] PASS: ${label}`);
    } else if (optional) {
        console.log(`[release-gate] WARN (optional failed): ${label} (exit ${code})`);
    } else {
        console.log(`[release-gate] FAIL: ${label} (exit ${code})`);
    }
    return { label, ok, code, optional };
};

const persistGateStatus = ({ status, summary, steps }) => {
    try {
        const payload = {
            status,
            generatedAt: new Date().toISOString(),
            summary,
            steps: Array.isArray(steps) ? steps : []
        };
        fs.mkdirSync(path.dirname(releaseStatusPath), { recursive: true });
        fs.writeFileSync(releaseStatusPath, JSON.stringify(payload, null, 2));
    } catch (error) {
        console.log(`[release-gate] WARN: failed to persist status file (${error.message})`);
    }
};

const hasSmokeEnv = () => {
    const required = [
        process.env.SMOKE_API_BASE,
        process.env.SMOKE_ADMIN_EMAIL,
        process.env.SMOKE_ADMIN_PASSWORD
    ];
    return required.every((value) => String(value || '').trim());
};

const main = () => {
    const includeSmoke = hasFlag('--with-smoke');
    const skipCompliance = hasFlag('--skip-compliance');
    const skipBackup = hasFlag('--skip-backup');
    const skipAudit = hasFlag('--skip-audit');

    console.log('[release-gate] Starting release gate checks');
    const steps = [];

    steps.push(runStep({
        label: 'Preflight release',
        command: 'node',
        args: ['scripts/preflightRelease.js'],
        cwd: rootDir
    }));

    if (!skipAudit) {
        steps.push(runStep({
            label: 'Audit consistency',
            command: 'npm',
            args: ['run', 'audit:consistency', '--', '--days', '30', '--limit', '2000'],
            cwd: backendDir
        }));
    }

    if (!skipBackup) {
        steps.push(runStep({
            label: 'Backup drill snapshots',
            command: 'npm',
            args: ['run', 'backup:drill'],
            cwd: backendDir
        }));
    }

    if (!skipCompliance) {
        steps.push(runStep({
            label: 'Compliance readiness report',
            command: 'npm',
            args: ['run', 'compliance:report', '--', '--days', '365'],
            cwd: backendDir
        }));
    }

    if (includeSmoke) {
        const smokeOptional = !hasSmokeEnv();
        if (smokeOptional) {
            console.log('[release-gate] Smoke test env missing; running as optional step.');
        }
        steps.push(runStep({
            label: 'Billing smoke flow',
            command: 'npm',
            args: ['run', 'smoke:billing'],
            cwd: backendDir,
            optional: smokeOptional
        }));
    }

    const failedRequired = steps.filter((step) => !step.ok && !step.optional);
    const summary = {
        totalSteps: steps.length,
        passed: steps.filter((step) => step.ok).length,
        failedRequired: failedRequired.length,
        failedOptional: steps.filter((step) => !step.ok && step.optional).length
    };

    console.log('\n[release-gate] Summary:', summary);
    if (failedRequired.length > 0) {
        persistGateStatus({ status: 'failed', summary, steps });
        console.log('[release-gate] Blocking failures:');
        failedRequired.forEach((step) => {
            console.log(`- ${step.label} (exit ${step.code})`);
        });
        process.exit(2);
    }
    persistGateStatus({ status: 'passed', summary, steps });
    console.log('[release-gate] Release gate passed');
};

main();
