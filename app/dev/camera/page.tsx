'use client';

import { useEffect, useRef, useState } from 'react';

type Diagnostic = Record<string, unknown>;

export default function CameraDiagnosticsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic>(() => typeof window === 'undefined' ? {} : { secureContext: window.isSecureContext, mediaDevices: Boolean(navigator.mediaDevices) });
  const stop = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; };
  const start = async () => {
    stop();
    const before = navigator.mediaDevices ? await navigator.mediaDevices.enumerateDevices() : [];
    try {
      let stream: MediaStream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: 'user' } }, audio: false }); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      streamRef.current = stream;
      const video = videoRef.current!; video.srcObject = stream; await video.play();
      await new Promise((resolve) => video.videoWidth ? resolve(undefined) : video.addEventListener('loadedmetadata', resolve, { once: true }));
      const after = await navigator.mediaDevices.enumerateDevices();
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360; canvas.getContext('2d')?.drawImage(video, 0, 0, 640, 360);
      setDiagnostic({ secureContext: window.isSecureContext, mediaDevices: true, devicesBefore: before.map((d) => ({ kind: d.kind, label: d.label })), devicesAfter: after.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId })), selectedDeviceId: stream.getVideoTracks()[0]?.getSettings().deviceId, videoWidth: video.videoWidth, videoHeight: video.videoHeight, readyState: video.readyState, frameExtraction: canvas.toDataURL('image/jpeg', .72).length > 1000 });
    } catch (error) {
      setDiagnostic({ secureContext: window.isSecureContext, mediaDevices: Boolean(navigator.mediaDevices), devicesBefore: before.map((d) => ({ kind: d.kind, label: d.label })), errorName: error instanceof DOMException ? error.name : 'Error', errorMessage: error instanceof Error ? error.message : String(error) });
    }
  };
  useEffect(() => stop, []);
  return <main className="focus-page"><section className="focus-content"><h1>Camera diagnostics</h1><video ref={videoRef} muted playsInline /><div className="button-row"><button className="button primary" onClick={start}>Start diagnostic</button><button className="button secondary" onClick={stop}>Stop</button></div><pre>{JSON.stringify(diagnostic, null, 2)}</pre></section></main>;
}
