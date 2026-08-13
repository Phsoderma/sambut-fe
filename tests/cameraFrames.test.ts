import { describe, expect, it } from 'vitest';
import { centeredSquareSource } from '../app/lib/cameraFrames';

describe('centeredSquareSource', () => {
  it('center-crops a 16:9 C270 frame without distortion', () => {
    expect(centeredSquareSource(1280, 720)).toEqual({ sx: 280, sy: 0, size: 720 });
  });

  it('keeps a square SIGN_NEW source frame intact', () => {
    expect(centeredSquareSource(640, 640)).toEqual({ sx: 0, sy: 0, size: 640 });
  });
});
