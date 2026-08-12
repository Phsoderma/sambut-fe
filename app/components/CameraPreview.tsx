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

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setPhase('PREPARING');
    setMessage('Meminta izin kamera…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('READY');
      setMessage('Pastikan wajah, tangan, dan tubuh bagian atas terlihat.');
    } catch {
      setPhase('UNCERTAIN');
      setMessage('Kamera tidak tersedia. Periksa izin kamera atau gunakan jawaban teks.');
    }
  }, [stopCamera]);

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
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CAMERA_UNAVAILABLE');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.55);
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
        {phase === 'PROCESSING' && <div className="camera-message">Memahami isyarat Anda…</div>}
        {phase === 'CAPTURING' && <div className="camera-status">Merekam jawaban</div>}
      </div>
      <div className="camera-rail">
        <div>
          <p className="eyebrow">Jawaban dengan BISINDO</p>
          <p className={phase === 'UNCERTAIN' ? 'error-text' : 'guidance'}>{message}</p>
        </div>
        <div className="button-row">
          {phase === 'READY' && <button className="button primary" onClick={capture}>Mulai isyarat</button>}
          {phase === 'MATCHED' && <button className="button primary" onClick={accept} disabled={busy}>Benar, kirim jawaban</button>}
          {(phase === 'UNCERTAIN' || phase === 'MATCHED') && <button className="button secondary" onClick={startCamera}>Coba lagi</button>}
          <button className="button secondary" onClick={onText}>Ketik jawaban</button>
          <button className="button quiet" onClick={onHelp}>Minta bantuan petugas</button>
          <button className="button quiet" onClick={onCancel}>Kembali</button>
        </div>
      </div>
    </section>
  );
}
