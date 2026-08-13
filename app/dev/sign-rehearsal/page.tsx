'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Header } from '../../components/Header';
import { chooseCamera, selectedVideoConstraints, stopMediaStream } from '../../lib/cameraDevices';
import { captureSquareJpeg } from '../../lib/cameraFrames';

type RehearsalClass = 'Iya' | 'Tidak' | 'Tolong';
type DiagnosticDecision = {
  status: 'MATCHED' | 'UNKNOWN';
  intent: string;
  confidence: number;
  target_vote_count: number;
  dominant_share: number;
  failure_category: string | null;
};
type DiagnosticResponse = { decision: DiagnosticDecision; latency_ms: number; detector_imgsz: number };

const CLASSES: RehearsalClass[] = ['Iya', 'Tidak', 'Tolong'];
const DETECTOR_URL = process.env.NEXT_PUBLIC_DETECTOR_URL ?? 'http://127.0.0.1:7870';

export default function SignRehearsalPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedClass, setSelectedClass] = useState<RehearsalClass>('Iya');
  const [cameraState, setCameraState] = useState('Menyiapkan Logitech C270…');
  const [busy, setBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);

  const stop = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput');
      const selected = chooseCamera(devices);
      const stream = await navigator.mediaDevices.getUserMedia({ video: selected ? selectedVideoConstraints(selected) : true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!videoRef.current.videoWidth) await new Promise<void>((resolve) => videoRef.current?.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      setCameraState(`${stream.getVideoTracks()[0]?.label || 'Kamera'} siap`);
    } catch (error) {
      setCameraState(error instanceof DOMException ? `${error.name}: ${error.message}` : 'Kamera tidak tersedia');
    }
  }, [stop]);

  useEffect(() => { queueMicrotask(() => void start()); return stop; }, [start, stop]);

  const frame = useCallback(() => {
    const video = videoRef.current;
    if (!video) throw new Error('Frame kamera belum siap');
    return captureSquareJpeg(video, 0.72);
  }, []);

  const diagnose = async () => {
    setBusy(true); setDiagnostic(null);
    try {
      const frames: string[] = [];
      for (let index = 0; index < 30; index += 1) {
        frames.push(frame());
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      const response = await fetch(`${DETECTOR_URL}/diagnose`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ frames, jpeg_quality: 0.72, detector_imgsz: 320 }),
      });
      if (!response.ok) throw new Error(`Diagnostik gagal (${response.status})`);
      setDiagnostic(await response.json() as DiagnosticResponse);
    } catch (error) {
      setCameraState(error instanceof Error ? error.message : 'Diagnostik gagal');
    } finally { setBusy(false); }
  };

  return <div className="app-shell">
    <Header role="user" />
    <main className="dev-page">
      <div className="rehearsal-heading"><div><p className="eyebrow">Dev-only · latihan referensi</p><h1>Latihan pose SIGN_NEW</h1><p className="guidance">Halaman ini bukan alur pasien dan tidak menyimpan frame.</p></div></div>
      <div className="rehearsal-grid">
        <div>
          <div className="rehearsal-camera"><video ref={videoRef} muted playsInline aria-label="Pratinjau Logitech C270" /></div>
          <div className="rehearsal-actions"><button className="button primary" onClick={diagnose} disabled={busy}>{busy ? 'Merekam 30 frame…' : 'Uji pose sumber'}</button><button className="button secondary" onClick={() => void start()}>Mulai ulang kamera</button><span className="guidance">{cameraState}</span></div>
        </div>
        <aside className="reference-panel">
          <label><strong>Kelas referensi</strong><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value as RehearsalClass)}>{CLASSES.map((name) => <option key={name}>{name}</option>)}</select></label>
          <div className="reference-grid">{[1, 2, 3, 4].map((index) => <Image key={index} width={180} height={180} src={`/dev/sign-new/${selectedClass.toLowerCase()}-${index}.jpg`} alt={`Referensi ${selectedClass} ${index}`} />)}</div>
          <p className="guidance">SIGN_NEW v9, CC BY 4.0 — public-dataset reference; not independent BISINDO validation.</p>
          <div className="diagnostic-summary" aria-live="polite">{diagnostic ? <><div>result={diagnostic.decision.status} {diagnostic.decision.intent}</div><div>failure={diagnostic.decision.failure_category ?? 'NONE'}</div><div>votes={diagnostic.decision.target_vote_count}/30 share={diagnostic.decision.dominant_share}</div><div>confidence={diagnostic.decision.confidence.toFixed(3)} latency={diagnostic.latency_ms}ms</div></> : 'Belum ada percobaan.'}</div>
        </aside>
      </div>
    </main>
  </div>;
}
