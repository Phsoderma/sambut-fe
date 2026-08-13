import { describe, expect, it } from 'vitest';
import { centeredSquareSource, letterboxGeometry } from '../app/lib/cameraFrames';

describe('centeredSquareSource', () => {
  it('center-crops a 16:9 C270 frame without distortion', () => {
    expect(centeredSquareSource(1280, 720)).toEqual({ sx: 280, sy: 0, size: 720 });
  });

  it('keeps a square SIGN_NEW source frame intact', () => {
    expect(centeredSquareSource(640, 640)).toEqual({ sx: 0, sy: 0, size: 640 });
  });
});

describe('letterboxGeometry', () => {
  it('preserves the complete 16:9 C270 field without stretching', () => {
    expect(letterboxGeometry(1280, 720)).toEqual({ dx: 0, dy: 140, dw: 640, dh: 360 });
  });
});
