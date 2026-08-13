import { ApiError, SessionSnapshot, SignPrediction } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_SAMBUT_API_URL || 'http://localhost:7860';

export type BackendStatus = {
  reachable: boolean;
  modelLoaded: boolean;
  modelVersion: string | null;
};

export async function getBackendStatus(): Promise<BackendStatus> {
  try {
    const health = await request<{ model_loaded: boolean; model_version: string | null }>('/health');
    return { reachable: true, modelLoaded: health.model_loaded, modelVersion: health.model_version };
  } catch {
    return { reachable: false, modelLoaded: false, modelVersion: null };
  }
}

function clientEventId(): string {
  return crypto.randomUUID();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Layanan tidak dapat dihubungi.', 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail ?? {};
    throw new ApiError(
      detail.code ?? 'NETWORK_ERROR',
      detail.message ?? 'Permintaan tidak dapat diproses.',
      response.status,
      detail.snapshot,
    );
  }
  return body as T;
}

export async function createSession() {
  return request<{
    session_id: string;
    staff_token: string;
    join_code: string;
    snapshot: SessionSnapshot;
  }>('/api/v1/sessions', { method: 'POST', body: '{}' });
}

export async function consumeLocalDemoBootstrap(nonce: string) {
  return request<{ role: 'STAFF'; sessionId: string; token: string; joinCode: string }>(
    `/api/v1/local-demo/bootstrap/${encodeURIComponent(nonce)}`,
  );
}

export async function joinSession(sessionId: string, joinCode: string) {
  return request<{ user_token: string; snapshot: SessionSnapshot }>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/join`,
    { method: 'POST', body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() }) },
  );
}

export async function getSnapshot(sessionId: string, token: string) {
  return request<SessionSnapshot>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendEvent(
  sessionId: string,
  token: string,
  expectedVersion: number,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  return request<{ snapshot: SessionSnapshot; duplicate: boolean }>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        event_type: eventType,
        client_event_id: clientEventId(),
        expected_version: expectedVersion,
        payload,
      }),
    },
  );
}

export async function predictFrames(
  sessionId: string,
  token: string,
  expectedVersion: number,
  frames: string[],
) {
  return request<SignPrediction>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/sign/predict`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      client_event_id: clientEventId(),
      expected_version: expectedVersion,
      frames,
    }),
  });
}

export async function confirmPrediction(
  sessionId: string,
  token: string,
  expectedVersion: number,
  predictionId: string,
) {
  return request<{ snapshot: SessionSnapshot; accepted_intent: string; duplicate: boolean }>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/sign/confirm`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        prediction_id: predictionId,
        client_event_id: clientEventId(),
        expected_version: expectedVersion,
      }),
    },
  );
}

export function websocketUrl(sessionId: string, token: string): string {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/api/v1/sessions/${encodeURIComponent(sessionId)}/ws`;
  url.search = new URLSearchParams({ token }).toString();
  return url.toString();
}
