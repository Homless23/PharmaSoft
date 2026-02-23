jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      response: {
        use: jest.fn()
      }
    }
  }))
}));

jest.mock('../utils/apiErrorTelemetry', () => ({
  installApiErrorTelemetryConsole: jest.fn(),
  recordApiErrorTelemetry: jest.fn()
}));

jest.mock('../utils/apiError', () => ({
  getApiError: jest.fn(() => ({
    message: 'Friendly message',
    code: 'AUTH_RATE_LIMITED',
    status: 429
  }))
}));

describe('services/api interceptor', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('normalizes rejected responses and attaches apiError', async () => {
    const axios = require('axios');
    await import('./api');

    expect(axios.create).toHaveBeenCalledTimes(1);
    const apiInstance = axios.create.mock.results[0].value;
    const useMock = apiInstance.interceptors.response.use;
    expect(useMock).toHaveBeenCalledTimes(1);
    const rejectHandler = useMock.mock.calls[0][1];

    const raw = {
      response: {
        data: {
          message: 'Raw backend msg'
        }
      }
    };

    await expect(rejectHandler(raw)).rejects.toBe(raw);
    expect(raw.apiError).toEqual({
      message: 'Friendly message',
      code: 'AUTH_RATE_LIMITED',
      status: 429
    });
    expect(raw.response.data.message).toBe('Friendly message');
    expect(raw.response.data.originalMessage).toBe('Raw backend msg');
    expect(raw.response.data.code).toBe('AUTH_RATE_LIMITED');
    expect(raw.response.data.status).toBe(429);
  });
});

