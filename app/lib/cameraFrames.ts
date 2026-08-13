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
