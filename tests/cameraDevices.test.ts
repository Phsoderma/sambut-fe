import { describe, expect, it, vi } from 'vitest';
import { cameraErrorMessage, chooseCamera, rankCamera, selectedVideoConstraints, shouldShowCameraSelector, stopMediaStream } from '../app/lib/cameraDevices';

const camera = (deviceId: string, label: string) => ({ deviceId, label, kind: 'videoinput' as const });

describe('camera selection', () => {
  const devices = [camera('camo', 'Camo'), camera('c270', 'Logi C270 HD WebCam'), camera('integrated', 'Integrated Camera')];
  it('prefers saved device when present', () => expect(chooseCamera(devices, 'integrated')).toBe('integrated'));
  it('otherwise prefers Logitech C270', () => expect(chooseCamera(devices)).toBe('c270'));
  it('deprioritizes virtual cameras', () => expect(rankCamera(devices[0])).toBeLessThan(rankCamera(devices[2])));
  it('falls back to the first browser device when labels are unavailable', () => expect(chooseCamera([camera('first', ''), camera('second', '')])).toBe('first'));
  it('reports Windows permission separately', () => expect(cameraErrorMessage(new DOMException('', 'NotAllowedError'))).toContain('Windows memblokir'));
  it('keeps selector available after initial failure when devices were enumerated', () => expect(shouldShowCameraSelector(3)).toBe(true));
  it('retries the exact selected device', () => expect(selectedVideoConstraints('c270').deviceId).toEqual({ exact: 'c270' }));
  it('stops every prior track', () => {
    const stopA = vi.fn(), stopB = vi.fn();
    stopMediaStream({ getTracks: () => [{ stop: stopA }, { stop: stopB }] } as unknown as MediaStream);
    expect(stopA).toHaveBeenCalledOnce(); expect(stopB).toHaveBeenCalledOnce();
  });
});
