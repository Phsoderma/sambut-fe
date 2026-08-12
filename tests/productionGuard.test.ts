import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const productionFiles = [
  'app/lib/types.ts',
  'app/lib/apiClient.ts',
  'app/lib/SessionContext.tsx',
  'app/components/CameraPreview.tsx',
  'app/staff/page.tsx',
  'app/user/page.tsx',
].map((file) => readFileSync(resolve(file), 'utf8')).join('\n');

describe('production R0 guardrails', () => {
  it.each([
    'PATIENT_STATUS',
    'TERIMA_KASIH',
    'confidence: 0.88',
    'Math.random()',
    'BroadcastChannel',
    'localStorage',
    'scan KTP',
    'verifikasi BPJS',
  ])('does not contain obsolete or fake runtime pattern %s', (pattern) => {
    expect(productionFiles).not.toContain(pattern);
  });

  it('contains the physical document controls', () => {
    expect(productionFiles).toContain('IDENTITY_DOCUMENT_RECEIVED');
    expect(productionFiles).toContain('INSURANCE_NOT_USED');
  });
});
