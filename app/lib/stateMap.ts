import { RecoveryStatus, WorkflowState } from './types';

export type UserStateId =
  | 'U00' | 'U01' | 'U02A' | 'U02B' | 'U02C' | 'U07' | 'U08' | 'U09'
  | 'U10' | 'U11' | 'U12' | 'U13' | 'U14';
export type StaffStateId =
  | 'S00' | 'S01' | 'S02' | 'S04' | 'S06' | 'S08' | 'S09' | 'S10' | 'S11' | 'S12' | 'S13';

export function userStateId(state: WorkflowState, recovery: RecoveryStatus, connected: boolean): UserStateId {
  if (!connected) return 'U12';
  if (recovery === 'HUMAN_HELP') return 'U09';
  if (recovery === 'TEXT_FALLBACK') return 'U08';
  if (recovery === 'UNKNOWN') return 'U07';
  return {
    SESSION_START: 'U01',
    PURPOSE_TREATMENT_CHECK: 'U02A',
    PURPOSE_REFERRAL_CHECK: 'U02B',
    PURPOSE_ADMIN_CHECK: 'U02C',
    IDENTITY_DOCUMENT: 'U10',
    INSURANCE_DOCUMENT: 'U11',
    NEXT_STEP: 'U13',
    COMPLETE: 'U14',
  }[state] as UserStateId;
}

export function staffStateId(state: WorkflowState, recovery: RecoveryStatus, connected: boolean): StaffStateId {
  if (!connected) return 'S13';
  if (recovery === 'HUMAN_HELP') return 'S08';
  return {
    SESSION_START: 'S01',
    PURPOSE_TREATMENT_CHECK: 'S02',
    PURPOSE_REFERRAL_CHECK: 'S04',
    PURPOSE_ADMIN_CHECK: 'S06',
    IDENTITY_DOCUMENT: 'S09',
    INSURANCE_DOCUMENT: 'S10',
    NEXT_STEP: 'S11',
    COMPLETE: 'S12',
  }[state] as StaffStateId;
}
