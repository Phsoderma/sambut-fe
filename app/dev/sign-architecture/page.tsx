'use client';

import { useEffect, useRef, useState } from 'react';
import { captureVariantJpeg } from '../../lib/cameraFrames';
import { chooseCamera, selectedVideoConstraints, stopMediaStream } from '../../lib/cameraDevices';

const DETECTOR_URL = process.env.NEXT_PUBLIC_DETECTOR_URL || 'http://127.0.0.1:7870';
const variants = ['center-original', 'center-flip', 'letterbox-original', 'letterbox-flip'] as const;
type IntendedClass = 'Iya' | 'Tidak' | 'Tolong' | 'Neutral';

interface ArchitectureRun {
  timestamp: string;
  intendedClass: IntendedClass;
  variants: Record<string, unknown>;
}

export default function SignArchitecturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [intendedClass, setIntendedClass] = useState<IntendedClass>('Iya');
  const [runs, setRuns] = useState<ArchitectureRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sambut-p87-architecture-runs');
      if (saved) {
        const parsed = JSON.parse(saved) as ArchitectureRun[];
        queueMicrotask(() => setRuns(parsed));
      }
    } catch {
      localStorage.removeItem('sambut-p87-architecture-runs');
    }
    return () => stopMediaStream(streamRef.current);
  }, []);

  async function start() {
    setError('');
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput');
      const selected = chooseCamera(devices, sessionStorage.getItem('sambut-camera-device') || '');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selected ? selectedVideoConstraints(selected) : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CAMERA_UNAVAILABLE');
    }
  }

  async function run() {
    if (!videoRef.current || !streamRef.current) {
      setError('Aktifkan kamera terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const frames: Record<string, string[]> = Object.fromEntries(variants.map((name) => [name, []]));
      for (let index = 0; index < 30; index += 1) {
        for (const name of variants) {
          const [mode, orientation] = name.split('-');
          frames[name].push(captureVariantJpeg(videoRef.current, mode as 'center' | 'letterbox', orientation === 'flip'));
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      const output: Record<string, unknown> = {};
      for (const name of variants) {
        const response = await fetch(`${DETECTOR_URL}/diagnose`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ frames: frames[name], jpeg_quality: 0.72, detector_imgsz: 320 }),
        });
        if (!response.ok) throw new Error(`DETECTOR_${response.status}`);
        output[name] = await response.json();
      }
      const next = [...runs, { timestamp: new Date().toISOString(), intendedClass, variants: output }];
      setRuns(next);
      localStorage.setItem('sambut-p87-architecture-runs', JSON.stringify(next));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ARCHITECTURE_TEST_FAILED');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(runs, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sambut-p87-camera-ab-${new Date().toISOString().replaceAll(':', '-')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="focus-page">
      <section className="focus-content">
        <p className="eyebrow">P8.7 - eksperimen pengembang</p>
        <h1>Orientasi x area inferensi</h1>
        <p>Satu burst C270 menghasilkan empat varian. Pilih isyarat yang benar sebelum merekam. Hasil ini bukan bukti linguistik.</p>
        <div className="rehearsal-camera"><video ref={videoRef} muted playsInline /></div>
        <label>
          Isyarat yang dicoba
          <select value={intendedClass} onChange={(event) => setIntendedClass(event.target.value as IntendedClass)}>
            {(['Iya', 'Tidak', 'Tolong', 'Neutral'] as IntendedClass[]).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <div className="button-row">
          <button className="button secondary" onClick={start}>Aktifkan C270</button>
          <button className="button primary" disabled={busy} onClick={run}>{busy ? 'Menguji...' : 'Rekam satu burst A/B'}</button>
          <button className="button secondary" disabled={!runs.length} onClick={download}>Unduh JSON ({runs.length})</button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <pre>{JSON.stringify(runs.at(-1) || {}, null, 2)}</pre>
      </section>
    </main>
  );
}
