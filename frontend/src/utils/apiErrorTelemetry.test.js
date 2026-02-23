import { installApiErrorTelemetryConsole, recordApiErrorTelemetry } from './apiErrorTelemetry';

describe('apiErrorTelemetry', () => {
  beforeEach(() => {
    delete window.__PMS_API_ERROR_TELEMETRY__;
    delete window.pmsApiErrors;
  });

  test('installs console helper and records grouped counts', () => {
    installApiErrorTelemetryConsole();
    expect(window.pmsApiErrors).toBeTruthy();

    recordApiErrorTelemetry(
      { code: 'AUTH_RATE_LIMITED', status: 429, message: 'Rate limited' },
      { config: { method: 'post', url: '/auth/login' } }
    );
    recordApiErrorTelemetry(
      { code: 'AUTH_RATE_LIMITED', status: 429, message: 'Rate limited again' },
      { config: { method: 'post', url: '/auth/login' } }
    );
    recordApiErrorTelemetry(
      { code: '', status: 500, message: 'Server error' },
      { config: { method: 'get', url: '/v1/bills' } }
    );

    const summary = window.pmsApiErrors.summary();
    const authRow = summary.find((row) => row.code === 'AUTH_RATE_LIMITED');
    const httpRow = summary.find((row) => row.code === 'HTTP_500');

    expect(authRow?.count).toBe(2);
    expect(httpRow?.count).toBe(1);

    const recent = window.pmsApiErrors.recent(2);
    expect(recent.length).toBe(2);
    expect(recent[0].message).toBeTruthy();
  });

  test('clear resets aggregated data', () => {
    installApiErrorTelemetryConsole();
    recordApiErrorTelemetry({ code: 'X1', status: 400, message: 'm1' }, {});
    expect(window.pmsApiErrors.summary().length).toBeGreaterThan(0);
    expect(window.pmsApiErrors.clear()).toBe(true);
    expect(window.pmsApiErrors.summary()).toEqual([]);
  });
});

