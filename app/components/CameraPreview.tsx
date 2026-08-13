'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/SessionContext';
import { ApiError, SignIntent, SignPrediction } from '../lib/types';

interface CameraPreviewProps {
  onCancel: () => void;
  onText: () => void;
  onHelp: () => void;
}

const INTENT_LABELS: Record<Exclude<SignIntent, 'SIGN_UNKNOWN'>, string> = {
  SIGN_YES: 'Ya',
  SIGN_NO: 'Tidak',
  SIGN_HELP: 'Minta bantuan',
};

export function CameraPreview({ onCancel, onText, onHelp }: CameraPreviewProps) {
  const { predictFrames, confirmSign, busy } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<'PREPARING' | 'READY' | 'CAPTURING' | 'PROCESSING' | 'UNCERTAIN' | 'MATCHED'>('PREPARING');
  const [message, setMessage] = useState('Meminta izin kamera…');
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const waitForVideo = useCallback(async (video: HTMLVideoElement) => {
    if (video.readyState >= 2 && video.videoWidth > 0) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new DOMException('Camera metadata timed out', 'NotReadableError')), 8_000);
      const ready = () => {
        if (!video.videoWidth) return;
        window.clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', ready);
        resolve();
      };
      video.addEventListener('loadedmetadata', ready);
    });
  }, []);

  const startCamera = useCallback(async (selectedDeviceId = deviceId) => {
    stopCamera();
    setPhase('PREPARING');
    setMessage('Meminta izin kamera…');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new DOMException('Secure camera context required', 'SecurityError');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: 'user' } },
          audio: false,
        });
      } catch (firstError) {
        if (selectedDeviceId) throw firstError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        await waitForVideo(videoRef.current);
      }
      const available = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
      setDevices(available);
      const selected = stream.getVideoTracks()[0]?.getSettings().deviceId ?? '';
      if (selected) setDeviceId(selected);
      setPhase('READY');
      setMessage('Pastikan wajah, tangan, dan tubuh bagian atas terlihat.');
    } catch (caught) {
      stopCamera();
      setPhase('UNCERTAIN');
      const name = caught instanceof DOMException ? caught.name : 'CameraError';
      setMessage(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Izin kamera ditolak atau konteks tidak aman. Izinkan kamera, atau gunakan jawaban teks.'
        : name === 'NotReadableError'
          ? 'Kamera sedang dipakai aplikasi lain atau tidak dapat dibaca. Tutup aplikasi kamera lain lalu coba lagi.'
          : name === 'NotFoundError'
            ? 'Perangkat kamera tidak ditemukan. Gunakan jawaban teks atau minta bantuan petugas.'
            : 'Kamera tidak tersedia. Periksa perangkat atau gunakan jawaban teks.');
    }
  }, [deviceId, stopCamera, waitForVideo]);

  useEffect(() => {
    const timer = window.setTimeout(startCamera, 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureFrame = useCallback((): string => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) throw new Error('CAMERA_UNAVAILABLE');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CAMERA_UNAVAILABLE');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }, []);

  const capture = useCallback(async () => {
    if (!streamRef.current) return;
    setPhase('CAPTURING');
    setMessage('Silakan berikan isyarat jawaban.');
    try {
      const frames: string[] = [];
      for (let index = 0; index < 30; index += 1) {
        frames.push(captureFrame());
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      stopCamera();
      setPhase('PROCESSING');
      setMessage('Memahami isyarat Anda…');
      const result = await predictFrames(frames);
      setPrediction(result);
      if (result.status === 'MATCHED' && result.intent && result.prediction_id) {
        setPhase('MATCHED');
        setMessage(`Sistem memahami: ${INTENT_LABELS[result.intent as Exclude<SignIntent, 'SIGN_UNKNOWN'>]}`);
      } else {
        setPhase('UNCERTAIN');
        setMessage(
          result.status === 'MODEL_UNAVAILABLE'
            ? 'Pengenalan isyarat belum tersedia. Gunakan jawaban teks atau minta bantuan petugas.'
            : 'Isyarat belum dapat dipahami.',
        );
      }
    } catch (caught) {
      stopCamera();
      setPhase('UNCERTAIN');
      setMessage(
        caught instanceof ApiError && caught.code === 'NETWORK_ERROR'
          ? 'Koneksi terputus. Jawaban tidak dikirim.'
          : 'Isyarat belum dapat dipahami.',
      );
    }
  }, [captureFrame, predictFrames, stopCamera]);

  const accept = async () => {
    if (!prediction?.prediction_id) return;
    await confirmSign(prediction.prediction_id);
    onCancel();
  };

  return (
    <section className="camera-layout" aria-live="polite">
      <div className="camera-surface">
        <video ref={videoRef} muted playsInline aria-label="Pratinjau kamera langsung" />
        <div className="camera-guide" aria-hidden="true">
          <div className="guide-head" />
          <div className="guide-body" />
          <div className="guide-hand guide-left" />
          <div className="guide-hand guide-right" />
        </div>
        {phase === 'PROCESSING' && <div className="camera-message">Memahami isyarat Anda…</div>}
        {phase === 'CAPTURING' && <div className="camera-status">Merekam jawaban</div>}
      </div>
      <div className="camera-rail">
        <div>
          <p className="eyebrow">Jawaban dengan BISINDO</p>
          <p className="camera-instruction">Pastikan wajah dan kedua tangan terlihat di area panduan.</p>
          <p className={phase === 'UNCERTAIN' ? 'error-text' : 'guidance'}>{message}</p>
        </div>
        <div className="button-row">
          {devices.length > 1 && phase !== 'CAPTURING' && phase !== 'PROCESSING' && (
            <label className="camera-device">Kamera
              <select value={deviceId} onChange={(event) => { setDeviceId(event.target.value); void startCamera(event.target.value); }}>
                {devices.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `Kamera ${index + 1}`}</option>)}
              </select>
            </label>
          )}
          {phase === 'READY' && <button className="button primary" onClick={capture}>Mulai isyarat</button>}
          {phase === 'MATCHED' && <button className="button primary" onClick={accept} disabled={busy}>Benar, kirim jawaban</button>}
          {(phase === 'UNCERTAIN' || phase === 'MATCHED') && <button className="button secondary" onClick={() => void startCamera()}>Coba lagi</button>}
          <button className="button secondary" onClick={onText}>Ketik jawaban</button>
          <button className="button quiet" onClick={onHelp}>Minta bantuan petugas</button>
          <button className="button quiet" onClick={onCancel}>Kembali</button>
        </div>
      </div>
    </section>
  );
}
