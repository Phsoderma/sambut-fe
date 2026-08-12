import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, sendEvent } from '../app/lib/apiClient';
import { ApiError } from '../app/lib/types';

afterEach(() => vi.unstubAllGlobals());

describe('API client fail-closed behavior', () => {
  it('turns transport failure into NETWORK_ERROR, never success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(createSession()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('preserves typed server errors and authoritative stale snapshot', async () => {
    const snapshot = { session_id: 's', version: 4, workflow_state: 'PURPOSE_TREATMENT_CHECK' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: { code: 'INVALID_TRANSITION', message: 'stale', snapshot } }),
    }));
    try {
      await sendEvent('s', 'token', 1, 'HUMAN_HELP_REQUESTED');
      throw new Error('request should fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: 'INVALID_TRANSITION', status: 409, snapshot });
    }
  });

  it('returns only the server response on success', async () => {
    const response = { session_id: 's', staff_token: 't', join_code: 'ABCDEFGH', snapshot: { version: 0 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => response }));
    await expect(createSession()).resolves.toEqual(response);
  });
});
