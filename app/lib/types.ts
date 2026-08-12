export type WorkflowState =
  | 'SESSION_START'
  | 'PURPOSE_TREATMENT_CHECK'
  | 'PURPOSE_REFERRAL_CHECK'
  | 'PURPOSE_ADMIN_CHECK'
  | 'IDENTITY_DOCUMENT'
  | 'INSURANCE_DOCUMENT'
  | 'NEXT_STEP'
  | 'COMPLETE';

export type Purpose = 'TREATMENT' | 'REFERRAL' | 'ADMIN_DOCUMENT';
export type SignIntent = 'SIGN_YES' | 'SIGN_NO' | 'SIGN_HELP' | 'SIGN_UNKNOWN';
export type PredictionStatus = 'MATCHED' | 'UNKNOWN' | 'MODEL_UNAVAILABLE';
export type RecoveryStatus = 'NONE' | 'UNKNOWN' | 'TEXT_FALLBACK' | 'HUMAN_HELP';
export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';
export type Role = 'STAFF' | 'USER';

export interface SessionSnapshot {
  session_id: string;
  version: number;
  workflow_state: WorkflowState;
  resolved_purpose: Purpose | null;
  active_question: string | null;
  recovery_status: RecoveryStatus;
  exact_text: string | null;
  next_step: string | null;
  next_step_acknowledged: boolean;
  staff_connected: boolean;
  user_connected: boolean;
  last_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface Credentials {
  role: Role;
  sessionId: string;
  token: string;
  joinCode?: string;
}

export interface SignPrediction {
  status: PredictionStatus;
  intent: SignIntent | null;
  confidence: number | null;
  latency_ms: number | null;
  prediction_id: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly snapshot?: SessionSnapshot,
  ) {
    super(message);
  }
}
