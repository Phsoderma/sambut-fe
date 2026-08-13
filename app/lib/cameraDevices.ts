export type CameraChoice = Pick<MediaDeviceInfo, 'deviceId' | 'label' | 'kind'>;

const PHYSICAL_HINTS = ['logitech', 'c270', 'hd webcam c270', 'integrated camera'];
const VIRTUAL_HINTS = ['camo', 'virtual', 'obs', 'droidcam', 'streamlabs', 'broadcast', 'lsvcam'];

export function rankCamera(device: CameraChoice): number {
  const label = device.label.toLocaleLowerCase();
  if (label.includes('c270') || label.includes('logitech')) return 100;
  if (PHYSICAL_HINTS.some((hint) => label.includes(hint))) return 70;
  if (VIRTUAL_HINTS.some((hint) => label.includes(hint))) return -50;
  return label ? 10 : 0;
}

export function chooseCamera(devices: CameraChoice[], savedDeviceId = ''): string {
  if (savedDeviceId && devices.some((device) => device.deviceId === savedDeviceId)) return savedDeviceId;
  return [...devices].sort((a, b) => rankCamera(b) - rankCamera(a))[0]?.deviceId ?? '';
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : 'CameraError';
  if (name === 'SecurityError') return 'Kamera memerlukan localhost atau koneksi HTTPS.';
  if (name === 'NotAllowedError') return 'Windows memblokir akses kamera. Aktifkan akses kamera untuk aplikasi desktop, lalu coba lagi.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Kamera sedang dipakai aplikasi lain atau tidak dapat dibaca. Tutup aplikasi kamera lain lalu coba lagi.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Perangkat kamera yang dipilih tidak ditemukan. Pilih kamera lain atau gunakan jawaban teks.';
  return 'Kamera tidak menghasilkan gambar yang dapat dibaca. Pilih kamera lain atau gunakan jawaban teks.';
}

export function shouldShowCameraSelector(deviceCount: number): boolean {
  return deviceCount > 1;
}

export function selectedVideoConstraints(deviceId: string): MediaTrackConstraints {
  return { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } };
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
