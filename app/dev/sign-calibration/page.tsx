'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { captureSquareJpeg } from '../../lib/cameraFrames';
import { chooseCamera, selectedVideoConstraints, stopMediaStream } from '../../lib/cameraDevices';

type TargetClass = 'Iya' | 'Tidak' | 'Tolong';
type Pending = { burst_id: string; proposal_frame_index: number | null; proposal_box: number[] | null; diagnostic: { status: string; intent: string; failure_category: string | null }; snapshot: string };
const TARGETS: TargetClass[] = ['Iya', 'Tidak', 'Tolong'];
const REQUIRED = 8;
const DETECTOR_URL = process.env.NEXT_PUBLIC_DETECTOR_URL ?? 'http://127.0.0.1:7870';

export default function SignCalibrationPage() {
  const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null);
  const [runId] = useState(() => `cal-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${crypto.randomUUID().slice(0, 8)}`);
  const [classIndex, setClassIndex] = useState(0); const selectedClass = TARGETS[Math.min(classIndex, 2)];
  const [accepted, setAccepted] = useState<Record<TargetClass, number>>({ Iya: 0, Tidak: 0, Tolong: 0 });
  const [rejected, setRejected] = useState(0); const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false); const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraState, setCameraState] = useState('Menyiapkan C270…'); const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const complete = TARGETS.every((name) => accepted[name] >= REQUIRED);

  const stop = useCallback(() => { stopMediaStream(streamRef.current); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; }, []);
  const start = useCallback(async () => {
    stop();
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput');
      const selected = chooseCamera(devices, sessionStorage.getItem('sambut-camera-device') || '');
      const stream = await navigator.mediaDevices.getUserMedia({ video: selected ? selectedVideoConstraints(selected) : { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const track = stream.getVideoTracks()[0]; const s = track.getSettings(); setCameraState(`${track.label} · ${s.width}×${s.height}`);
    } catch (error) { setCameraState(error instanceof Error ? error.message : 'Kamera tidak tersedia'); }
  }, [stop]);
  useEffect(() => { fetch(`${DETECTOR_URL}/calibration/status`).then((r) => r.json()).then((v) => setUnlocked(v.unlocked === true)).catch(() => setUnlocked(false)); queueMicrotask(() => void start()); return stop; }, [start, stop]);

  const capture = async () => {
    if (busy || pending || complete) return; setBusy(true);
    try {
      for (let n = 3; n >= 1; n -= 1) { setCountdown(n); await new Promise((resolve) => setTimeout(resolve, 1000)); }
      setCountdown(0); const frames: string[] = [];
      for (let index = 0; index < 30; index += 1) { if (!videoRef.current) throw new Error('Kamera belum siap'); frames.push(captureSquareJpeg(videoRef.current, .72)); await new Promise((resolve) => setTimeout(resolve, 80)); }
      const track = streamRef.current?.getVideoTracks()[0]; const settings = track?.getSettings();
      const response = await fetch(`${DETECTOR_URL}/calibration/capture`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ run_id: runId, intended_class: selectedClass, camera_label: track?.label || 'Unknown camera', capture_width: videoRef.current?.videoWidth || settings?.width || 0, capture_height: videoRef.current?.videoHeight || settings?.height || 0, frames, jpeg_quality: .72, detector_imgsz: 320 }) });
      if (!response.ok) throw new Error(`Capture gagal (${response.status})`); const result = await response.json(); setPending({ ...result, snapshot: frames[result.proposal_frame_index ?? 15] });
    } catch (error) { setCameraState(error instanceof Error ? error.message : 'Capture gagal'); } finally { setCountdown(null); setBusy(false); }
  };
  const decide = async (accept: boolean) => {
    if (!pending) return; setBusy(true);
    try {
      const response = await fetch(`${DETECTOR_URL}/calibration/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ run_id: runId, burst_id: pending.burst_id, accepted: accept }) });
      if (!response.ok) throw new Error(`Review gagal (${response.status})`);
      if (accept) { const next = accepted[selectedClass] + 1; setAccepted((value) => ({ ...value, [selectedClass]: next })); if (next >= REQUIRED && classIndex < 2) setClassIndex((value) => value + 1); } else setRejected((value) => value + 1);
      setPending(null);
    } catch (error) { setCameraState(error instanceof Error ? error.message : 'Review gagal'); } finally { setBusy(false); }
  };
  const box = pending?.proposal_box; const boxStyle = box ? { left: `${box[0] / 6.4}%`, top: `${box[1] / 6.4}%`, width: `${(box[2] - box[0]) / 6.4}%`, height: `${(box[3] - box[1]) / 6.4}%` } : undefined;
  if (unlocked === false) return <div className="app-shell"><Header role="user" /><main className="dev-page"><section className="completion-card"><h1>Kalibrasi terkunci</h1><p>Keputusan forensik belum membuka kolektor.</p><Link href="/dev/sign-rehearsal?guided=1">Kembali</Link></section></main></div>;
  return <div className="app-shell"><Header role="user" /><main className="dev-page">
    <div className="rehearsal-heading"><div><p className="eyebrow">SINGLE_OPERATOR_CALIBRATION_ONLY</p><h1>Kalibrasi teknis lokal</h1><p className="guidance">PUBLIC_DATASET_GROUNDED_UNVALIDATED · tersimpan lokal di luar Git</p></div><div className="rehearsal-progress"><strong>{complete ? '24/24 selesai' : `${selectedClass} ${accepted[selectedClass]}/${REQUIRED}`}</strong><span>Ditolak {rejected}</span></div></div>
    {complete ? <section className="completion-card"><h2>Pilot kalibrasi selesai</h2><p>24 burst diterima dan semua keputusan review tersimpan. Jangan gunakan data ini sebagai uji akhir.</p></section> : <div className="rehearsal-grid"><div>
      <div className="rehearsal-camera"><video ref={videoRef} muted playsInline />{pending && <><Image fill unoptimized src={pending.snapshot} alt="Frame review" /><span className="proposal-box" style={boxStyle} /></>}{countdown !== null && <div className="countdown">{countdown === 0 ? 'REKAM' : countdown}</div>}</div>
      <div className="rehearsal-controls">{pending ? <><button className="button primary" onClick={() => void decide(true)} disabled={busy || !box}>Terima kotak</button><button className="button secondary" onClick={() => void decide(false)} disabled={busy}>Tolak &amp; ulangi</button></> : <button className="button primary" onClick={() => void capture()} disabled={busy || unlocked !== true}>{busy ? 'Merekam…' : 'Rekam burst'}</button>}<button className="button secondary" onClick={() => void start()} disabled={busy}>Pulihkan kamera</button></div><p className="guidance rehearsal-camera-state">{cameraState}</p>
    </div><aside className="reference-panel"><div><p className="eyebrow">Tiru kelas</p><h2>{selectedClass}</h2><p>Variasikan jarak, posisi horizontal, atau pencahayaan secara ringan tanpa mengubah pose sumber.</p></div><div className="reference-grid">{[1,2,3,4].map((i) => <Image key={i} className={i === 1 ? 'reference-active' : ''} width={180} height={180} src={`/dev/sign-new/${selectedClass.toLowerCase()}-${i}.jpg`} alt={`Referensi ${selectedClass} ${i}`} />)}</div><p className="guidance">Kotak berasal dari deteksi model lama dan wajib ditinjau. Tolak bila kotak tidak mencakup tangan/pose utama.</p>{pending && <div className="diagnostic-summary">hasil={pending.diagnostic.status} {pending.diagnostic.intent}<br />alasan={pending.diagnostic.failure_category || 'NONE'}<br />kotak={box ? 'TERSEDIA' : 'TIDAK ADA — wajib tolak'}</div>}</aside></div>}
  </main></div>;
}
