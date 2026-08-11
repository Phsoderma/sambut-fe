export type WorkflowState =
  | 'START'
  | 'PATIENT_STATUS'
  | 'IDENTITY'
  | 'INSURANCE'
  | 'DESTINATION'
  | 'CONFIRM'
  | 'COMPLETED';

export type UserIntent =
  | 'YA'
  | 'TIDAK'
  | 'TERIMA_KASIH'
  | 'SAKIT'
  | 'TOLONG'
  | 'NEW_PATIENT'
  | 'RETURNING_PATIENT'
  | 'BPJS'
  | 'GENERAL_PATIENT'
  | 'UNKNOWN';

export type StaffIntent =
  | 'TANYA_STATUS_PASIEN'
  | 'TANYA_KELUHAN'
  | 'TANYA_BPJS'
  | 'KONFIRMASI'
  | 'INSTRUKSI_TUNGGU'
  | 'INSTRUKSI_MASUK'
  | 'UNKNOWN';

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface SessionState {
  session_id: string;
  role_status: 'WAITING' | 'PAIRED' | 'ACTIVE' | 'DISCONNECTED';
  workflow_state: WorkflowState;
  current_question: {
    text: string;
    bisindo_video_url?: string;
    sign_description?: string;
  };
  question_history?: string[];
  staff_transcript: string | null;
  staff_intent: StaffIntent | null;
  user_intent: UserIntent | null;
  user_confirmed_text: string | null;
  confidence: number;
  confidence_band: ConfidenceBand;
  retry_count: number;
  need_human_help: boolean;
  has_pending_custom_question?: boolean;
  ktp_verification_status?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  ktp_image_url?: string | null;
  patient_answers?: Array<{
    question: string;
    answer: string;
    confidence: number;
    timestamp: string;
  }>;
  started_at: string;
  updated_at: string;
}

export interface SignPredictRequest {
  session_id: string;
  landmarks: number[][]; // 30 frames x 261 features
}

export interface SignPredictResponse {
  status: 'success' | 'error';
  intent: UserIntent;
  confidence: number;
  is_reliable: boolean;
  session_id: string;
}

export interface SpeechParseRequest {
  session_id: string;
  text: string;
  context?: string;
}

export interface SpeechParseResponse {
  status: 'success' | 'error';
  intent: StaffIntent;
  confidence: number;
  matched_keywords?: string[];
  session_id: string;
}
