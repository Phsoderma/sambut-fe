export function centeredSquareSource(width: number, height: number) {
  const size = Math.min(width, height);
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

export function captureSquareJpeg(video: HTMLVideoElement, quality = 0.72): string {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) throw new Error('CAMERA_UNAVAILABLE');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CAMERA_UNAVAILABLE');
  const { sx, sy, size } = centeredSquareSource(video.videoWidth, video.videoHeight);
  context.drawImage(video, sx, sy, size, size, 0, 0, 640, 640);
  return canvas.toDataURL('image/jpeg', quality);
}

export function letterboxGeometry(width: number, height: number, target = 640) {
  const scale = Math.min(target / width, target / height);
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);
  return { dx: Math.floor((target - dw) / 2), dy: Math.floor((target - dh) / 2), dw, dh };
}

export function captureLetterboxedJpeg(video: HTMLVideoElement, quality = 0.72, flipped = false): string {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) throw new Error('CAMERA_UNAVAILABLE');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CAMERA_UNAVAILABLE');
  context.fillStyle = '#727272';
  context.fillRect(0, 0, 640, 640);
  const { dx, dy, dw, dh } = letterboxGeometry(video.videoWidth, video.videoHeight);
  if (flipped) { context.translate(640, 0); context.scale(-1, 1); }
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, flipped ? 640 - dx - dw : dx, dy, dw, dh);
  return canvas.toDataURL('image/jpeg', quality);
}

export function captureVariantJpeg(video: HTMLVideoElement, mode: 'center' | 'letterbox', flipped = false, quality = 0.72): string {
  if (!flipped && mode === 'center') return captureSquareJpeg(video, quality);
  if (mode === 'letterbox') return captureLetterboxedJpeg(video, quality, flipped);
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 640;
  const context = canvas.getContext('2d'); if (!context) throw new Error('CAMERA_UNAVAILABLE');
  const { sx, sy, size } = centeredSquareSource(video.videoWidth, video.videoHeight);
  context.translate(640, 0); context.scale(-1, 1);
  context.drawImage(video, sx, sy, size, size, 0, 0, 640, 640);
  return canvas.toDataURL('image/jpeg', quality);
}
