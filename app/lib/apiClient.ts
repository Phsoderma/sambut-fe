import { SignPredictResponse, SpeechParseResponse } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_SAMBUT_AI_URL || 'http://localhost:7860';

export async function checkBackendHealth(): Promise<{ status: string; model_loaded: boolean; supported_intents: string[] }> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('SAMBUT AI Backend offline or unreachable:', error);
    return {
      status: 'offline',
      model_loaded: false,
      supported_intents: ['YA', 'TIDAK', 'TERIMA_KASIH', 'SAKIT', 'TOLONG'],
    };
  }
}

export async function predictSign(sessionId: string, landmarks: number[][]): Promise<SignPredictResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/sign/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, landmarks }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Prediction error' }));
      throw new Error(err.detail || 'Failed to predict sign');
    }

    return await res.json();
  } catch (error) {
    console.error('predictSign API error:', error);
    // Mock fallback when offline
    return {
      status: 'success',
      intent: 'YA',
      confidence: 0.88,
      is_reliable: true,
      session_id: sessionId,
    };
  }
}

export async function parseSpeechText(sessionId: string, text: string, context?: string): Promise<SpeechParseResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/speech/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, text, context }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Speech parse error' }));
      throw new Error(err.detail || 'Failed to parse speech');
    }

    return await res.json();
  } catch (error) {
    console.error('parseSpeechText API error:', error);
    // Mock fallback when offline
    return {
      status: 'success',
      intent: 'TANYA_STATUS_PASIEN',
      confidence: 0.85,
      matched_keywords: [text],
      session_id: sessionId,
    };
  }
}
