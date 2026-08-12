import { describe, expect, it } from 'vitest';
import { staffStateId, userStateId } from '../app/lib/stateMap';

describe('canonical state render mapping', () => {
  it('maps every user service state', () => {
    expect(userStateId('SESSION_START', 'NONE', true)).toBe('U01');
    expect(userStateId('PURPOSE_TREATMENT_CHECK', 'NONE', true)).toBe('U02A');
    expect(userStateId('PURPOSE_REFERRAL_CHECK', 'NONE', true)).toBe('U02B');
    expect(userStateId('PURPOSE_ADMIN_CHECK', 'NONE', true)).toBe('U02C');
    expect(userStateId('IDENTITY_DOCUMENT', 'NONE', true)).toBe('U10');
    expect(userStateId('INSURANCE_DOCUMENT', 'NONE', true)).toBe('U11');
    expect(userStateId('NEXT_STEP', 'NONE', true)).toBe('U13');
    expect(userStateId('COMPLETE', 'NONE', true)).toBe('U14');
  });

  it('maps recovery and offline before normal state', () => {
    expect(userStateId('PURPOSE_TREATMENT_CHECK', 'UNKNOWN', true)).toBe('U07');
    expect(userStateId('PURPOSE_TREATMENT_CHECK', 'TEXT_FALLBACK', true)).toBe('U08');
    expect(userStateId('PURPOSE_TREATMENT_CHECK', 'HUMAN_HELP', true)).toBe('U09');
    expect(userStateId('NEXT_STEP', 'NONE', false)).toBe('U12');
  });

  it('maps staff physical, next-step, complete, help, and offline states', () => {
    expect(staffStateId('IDENTITY_DOCUMENT', 'NONE', true)).toBe('S09');
    expect(staffStateId('INSURANCE_DOCUMENT', 'NONE', true)).toBe('S10');
    expect(staffStateId('NEXT_STEP', 'NONE', true)).toBe('S11');
    expect(staffStateId('COMPLETE', 'NONE', true)).toBe('S12');
    expect(staffStateId('PURPOSE_TREATMENT_CHECK', 'HUMAN_HELP', true)).toBe('S08');
    expect(staffStateId('NEXT_STEP', 'NONE', false)).toBe('S13');
  });
});
