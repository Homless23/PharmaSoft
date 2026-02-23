Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Frontend: tests (CI) =="
Set-Location (Join-Path $root "frontend")
$env:CI = "true"
npm run test:ci -- --runInBand

Write-Host "== Frontend: production build =="
npm run build

Write-Host "== Backend: syntax checks =="
Set-Location (Join-Path $root "backend")
node --check server.js
node --check controllers\billController.js
node --check controllers\notificationController.js
node --check routes\bills.js
node --check routes\notifications.js
node --check models\Bill.js
node --check models\Notification.js
node --check models\ExpiredOverrideToken.js

Write-Host "Release checks passed."

