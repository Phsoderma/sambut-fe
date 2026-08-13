'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { chooseCamera, selectedVideoConstraints, stopMediaStream } from '../../lib/cameraDevices';
import { captureSquareJpeg } from '../../lib/cameraFrames';

type RehearsalClass = 'Iya' | 'Tidak' | 'Tolong' | 'Neutral';
type AttemptKind = 'PRIMARY' | 'RETRY';
type DiagnosticDecision = {
  status: 'MATCHED' | 'UNKNOWN';
  intent: string;
  confidence: number;
  target_vote_count: number;
  dominant_share: number;
  failure_category: string | null;
};
type DiagnosticResponse = {
  persisted: boolean;
  decision: DiagnosticDecision;
  latency_ms: number;
  detector_imgsz: number;
};

const PLAN: RehearsalClass[] = [
  ...Array<RehearsalClass>(10).fill('Iya'),
  ...Array<RehearsalClass>(10).fill('Tidak'),
  ...Array<RehearsalClass>(10).fill('Tolong'),
  ...Array<RehearsalClass>(20).fill('Neutral'),
];
const INTENTS: Record<Exclude<RehearsalClass, 'Neutral'>, string> = {
  Iya: 'SIGN_YES', Tidak: 'SIGN_NO', Tolong: 'SIGN_HELP',
};
const DETECTOR_URL = process.env.NEXT_PUBLIC_DETECTOR_URL ?? 'http://127.0.0.1:7870';

function makeRunId() {
  return `p86-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
}

function classProgress(index: number, current: RehearsalClass) {
  const start = current === 'Iya' ? 0 : current === 'Tidak' ? 10 : current === 'Tolong' ? 20 : 30;
  const total = current === 'Neutral' ? 20 : 10;
  return `${Math.min(index - start + 1, total)}/${total}`;
}

export default function SignRehearsalPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attemptIdRef = useRef(0);
  const [runId] = useState(makeRunId);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [referenceIndex, setReferenceIndex] = useState(1);
  const [cameraState, setCameraState] = useState('Menyiapkan Logitech C270…');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [attemptKind, setAttemptKind] = useState<AttemptKind>('PRIMARY');
  const [calibrationUnlocked, setCalibrationUnlocked] = useState(false);

  const complete = primaryIndex >= PLAN.length;
  const selectedClass = complete ? 'Neutral' : PLAN[primaryIndex];
  const targetIntent = selectedClass === 'Neutral' ? 'SIGN_UNKNOWN' : INTENTS[selectedClass];
  const outcome = useMemo(() => {
    if (!diagnostic) return null;
    if (diagnostic.decision.status === 'UNKNOWN') return selectedClass === 'Neutral' ? 'AMAN — UNKNOWN' : 'UNKNOWN';
    return diagnostic.decision.intent === targetIntent ? 'SESUAI' : 'SALAH SEMANTIK';
  }, [diagnostic, selectedClass, targetIntent]);

  const stop = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async (requestedDeviceId = '') => {
    stop();
    try {
      let available = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput');
      let selected = requestedDeviceId || chooseCamera(available, sessionStorage.getItem('sambut-camera-device') || '');
      const stream = await navigator.mediaDevices.getUserMedia({ video: selected ? selectedVideoConstraints(selected) : { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!videoRef.current.videoWidth) await new Promise<void>((resolve) => videoRef.current?.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      available = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput');
      selected = stream.getVideoTracks()[0]?.getSettings().deviceId || selected;
      setDevices(available); setDeviceId(selected);
      if (selected) sessionStorage.setItem('sambut-camera-device', selected);
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      setCameraState(`${track?.label || 'Kamera'} siap · ${settings?.width || '?'}×${settings?.height || '?'}`);
    } catch (error) {
      setCameraState(error instanceof DOMException ? `${error.name}: ${error.message}` : 'Kamera tidak tersedia');
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput'));
    }
  }, [stop]);

  useEffect(() => { queueMicrotask(() => void start()); return stop; }, [start, stop]);
  useEffect(() => { fetch(`${DETECTOR_URL}/calibration/status`).then((response) => response.json()).then((value) => setCalibrationUnlocked(value.unlocked === true)).catch(() => undefined); }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) throw new Error('Frame kamera belum siap');
    return captureSquareJpeg(video, 0.72);
  }, []);

  const runAttempt = async (kind: AttemptKind) => {
    if (complete || busy) return;
    setBusy(true); setDiagnostic(null); setAttemptKind(kind);
    try {
      for (let value = 3; value >= 1; value -= 1) {
        setCountdown(value);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      setCountdown(0);
      const frames: string[] = [];
      for (let index = 0; index < 30; index += 1) {
        frames.push(capture());
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      const video = videoRef.current;
      const track = streamRef.current?.getVideoTracks()[0];
      const settings = track?.getSettings();
      attemptIdRef.current += 1;
      const response = await fetch(`${DETECTOR_URL}/rehearsal/attempt`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          run_id: runId, attempt_id: attemptIdRef.current, intended_class: selectedClass,
          camera_label: track?.label || 'Unknown camera', capture_width: video?.videoWidth || settings?.width || 0,
          capture_height: video?.videoHeight || settings?.height || 0, crop_size: 640,
          attempt_kind: kind, frames, jpeg_quality: 0.72, detector_imgsz: 320,
        }),
      });
      if (!response.ok) throw new Error(`Perekaman diagnostik gagal (${response.status})`);
      const result = await response.json() as DiagnosticResponse;
      if (!result.persisted) throw new Error('Hasil tidak tersimpan');
      setDiagnostic(result);
    } catch (error) {
      attemptIdRef.current = Math.max(0, attemptIdRef.current - 1);
      setCameraState(error instanceof Error ? error.message : 'Diagnostik gagal');
    } finally { setCountdown(null); setBusy(false); }
  };

  const next = () => {
    setPrimaryIndex((value) => Math.min(value + 1, PLAN.length));
    setReferenceIndex(1); setDiagnostic(null); setAttemptKind('PRIMARY');
  };

  return <div className="app-shell">
    <Header role="user" />
    <main className="dev-page">
      <div className="rehearsal-heading">
        <div><p className="eyebrow">Dev-only · hasil tersimpan otomatis</p><h1>Latihan &amp; Uji Isyarat</h1><p className="guidance">Frame tidak disimpan. ID run: <code>{runId}</code></p></div>
        <div className="rehearsal-heading-actions">{calibrationUnlocked && <Link className="button secondary" href="/dev/sign-calibration">Kalibrasi</Link>}<div className="rehearsal-progress"><strong>{complete ? '50/50 selesai' : `${selectedClass} ${classProgress(primaryIndex, selectedClass)}`}</strong><span>{Math.min(primaryIndex, 50)}/50 percobaan utama</span></div></div>
      </div>
      {complete ? <section className="completion-card"><h2>Rangkaian utama selesai</h2><p>Semua 50 percobaan utama dan setiap retry telah dicatat. Jangan menambah atau menghapus hasil sebelum analisis forensik.</p>{calibrationUnlocked && <Link className="button primary" href="/dev/sign-calibration">Kalibrasi</Link>}</section> : <div className="rehearsal-grid">
        <div>
          <div className="rehearsal-camera"><video ref={videoRef} muted playsInline aria-label="Pratinjau Logitech C270" />{countdown !== null && <div className="countdown" aria-live="assertive">{countdown === 0 ? 'REKAM' : countdown}</div>}</div>
          <div className="rehearsal-controls">
            <label className="camera-device"><span>Kamera</span><select value={deviceId} onChange={(event) => void start(event.target.value)} disabled={busy}>{devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${device.deviceId.slice(0, 6)}`}</option>)}</select></label>
            {!diagnostic && <button className="button primary" onClick={() => void runAttempt('PRIMARY')} disabled={busy}>{busy ? (countdown === null ? 'Memproses…' : 'Bersiap…') : 'Mulai percobaan'}</button>}
            {diagnostic && <><button className="button primary" onClick={next} disabled={busy}>Simpan &amp; lanjut</button><button className="button secondary" onClick={() => void runAttempt('RETRY')} disabled={busy}>Ulangi contoh</button></>}
            <button className="button secondary" onClick={() => void start(deviceId)} disabled={busy}>Pulihkan kamera</button>
          </div>
          <p className="guidance rehearsal-camera-state">{cameraState}</p>
        </div>
        <aside className="reference-panel">
          <div><p className="eyebrow">Kelas saat ini</p><h2>{selectedClass}</h2><p>{selectedClass === 'Neutral' ? 'Pose netral atau gerakan tangan biasa yang bukan Iya, Tidak, atau Tolong.' : 'Tiru pose sumber berikut. Pastikan tangan dan badan berada dalam bingkai.'}</p></div>
          {selectedClass !== 'Neutral' ? <><div className="reference-grid">{[1, 2, 3, 4].map((index) => <Image key={index} className={index === referenceIndex ? 'reference-active' : ''} width={180} height={180} src={`/dev/sign-new/${selectedClass.toLowerCase()}-${index}.jpg`} alt={`Referensi ${selectedClass} ${index}`} />)}</div><button className="button secondary" onClick={() => setReferenceIndex((value) => value % 4 + 1)}>Contoh berikutnya</button></> : <div className="neutral-reference">Tidak ada contoh target untuk Neutral. Jangan meniru tiga kelas target.</div>}
          <p className="guidance">SIGN_NEW v9, CC BY 4.0 — referensi dataset publik; bukan validasi BISINDO independen.</p>
          <div className="diagnostic-summary" aria-live="polite">{diagnostic ? <><strong>{outcome}</strong><div>hasil={diagnostic.decision.status} {diagnostic.decision.intent}</div><div>alasan={diagnostic.decision.failure_category ?? 'NONE'}</div><div>votes={diagnostic.decision.target_vote_count}/30 · share={diagnostic.decision.dominant_share}</div><div>confidence={diagnostic.decision.confidence.toFixed(3)} · latency={diagnostic.latency_ms} ms</div><div>rekaman={attemptKind} · tersimpan</div></> : 'Belum ada hasil untuk percobaan ini.'}</div>
        </aside>
      </div>}
    </main>
  </div>;
}
