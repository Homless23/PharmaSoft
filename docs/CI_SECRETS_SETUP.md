# CI Secrets Setup

Configure the following GitHub repository secrets for CI and post-deploy smoke workflows.

## Required for Release Gate in CI
- `CI_MONGO_URI`
- `CI_JWT_SECRET`
- `CI_SUPER_ADMIN_EMAIL`

## Recommended
- `CI_BACKUP_SIGNING_SECRET`

## Required for Post-Deploy Smoke Billing
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

## Optional (if smoke needs DB-backed scripts)
- `CI_MONGO_URI`
- `CI_JWT_SECRET`

## Setup Path
GitHub -> Repository -> Settings -> Secrets and variables -> Actions -> New repository secret

## Validation
1. Run `Deploy Readiness` workflow manually.
2. Run `Post Deploy Smoke` workflow manually with `base_url`.
3. Confirm all jobs are green before approving a production release.

