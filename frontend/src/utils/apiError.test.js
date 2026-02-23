import { getApiError, getApiErrorMessage } from './apiError';

describe('apiError utils', () => {
  test('maps known backend code to user-friendly message', () => {
    const err = {
      response: {
        status: 429,
        data: {
          code: 'AUTH_RATE_LIMITED',
          message: 'raw backend message'
        }
      }
    };

    const result = getApiError(err, 'fallback');
    expect(result.code).toBe('AUTH_RATE_LIMITED');
    expect(result.status).toBe(429);
    expect(result.message).toBe('Too many sign-in attempts. Please wait and try again.');
  });

  test('prefers validation message when available', () => {
    const err = {
      response: {
        status: 400,
        data: {
          errors: [{ msg: 'Field is required' }]
        }
      }
    };

    expect(getApiErrorMessage(err, 'fallback')).toBe('Field is required');
  });

  test('returns network-unreachable message on ERR_NETWORK', () => {
    const err = { code: 'ERR_NETWORK' };
    const result = getApiError(err, 'fallback');
    expect(result.message).toContain('Cannot reach backend API');
  });

  test('falls back safely when payload is missing', () => {
    expect(getApiErrorMessage({}, 'fallback message')).toBe('fallback message');
  });
});

