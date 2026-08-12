'use client';

import { FormEvent, useState } from 'react';
import { CameraPreview } from '../components/CameraPreview';
import { Header } from '../components/Header';
import { useSession } from '../lib/SessionContext';
import { userStateId } from '../lib/stateMap';

type InputMode = 'QUESTION' | 'CAMERA' | 'TEXT';

export default function UserPage() {
  const {
    credentials,
    snapshot,
    connection,
    error,
    busy,
    joinUserSession,
    submitEvent,
    reconnectNow,
    leaveSession,
  } = useSession();
  const [sessionId, setSessionId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('QUESTION');

  const join = (event: FormEvent) => {
    event.preventDefault();
    joinUserSession(sessionId, joinCode);
  };

  if (!snapshot || !credentials) {
    return (
      <div className="app-shell">
        <Header role="user" />
        <main className="focus-page">
          <section className="focus-content compact">
            <p className="eyebrow">Terminal pengguna</p>
            <h1>Hubungkan ke petugas</h1>
            <p className="lead">Masukkan ID sesi dan kode sambung yang ditampilkan pada terminal petugas.</p>
            <form className="stack-form" onSubmit={join}>
              <label htmlFor="session-id">ID sesi</label>
              <input id="session-id" value={sessionId} onChange={(event) => setSessionId(event.target.value)} autoComplete="off" required />
              <label htmlFor="join-code">Kode sambung</label>
              <input id="join-code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={12} autoComplete="off" required />
              {error && <p className="error-box" role="alert">{error}</p>}
              <button className="button primary large" disabled={busy}>Hubungkan</button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (credentials.role !== 'USER') {
    return <RoleMismatch leaveSession={leaveSession} />;
  }

  const offline = connection === 'DISCONNECTED';
  const stateId = userStateId(snapshot.workflow_state, snapshot.recovery_status, !offline);
  const isPurpose = snapshot.workflow_state.startsWith('PURPOSE_');

  const sendText = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await submitEvent('USER_TEXT_SUBMITTED', { text: text.trim() });
    setText('');
    setInputMode('QUESTION');
  };

  const requestHelp = async () => {
    await submitEvent('HUMAN_HELP_REQUESTED');
    setInputMode('QUESTION');
  };

  return (
    <div className="app-shell">
      <Header role="user" />
      <main className="user-page" aria-live="polite">
        <div className="state-caption"><span>{stateId}</span><span>{connection === 'CONNECTED' ? 'Terhubung dengan petugas' : 'Status koneksi berubah'}</span></div>
        {offline && (
          <section className="focus-content compact">
            <h1>Koneksi terputus</h1>
            <p className="lead">Alur tidak berubah. Hubungkan kembali untuk mengambil status terakhir dari petugas.</p>
            <button className="button primary" onClick={reconnectNow}>Coba lagi</button>
          </section>
        )}
        {!offline && error && <p className="error-box" role="alert">{error}</p>}

        {!offline && snapshot.workflow_state === 'SESSION_START' && (
          <Focus title="Anda sudah terhubung dengan petugas." description="Silakan tunggu petugas memulai pertanyaan layanan." />
        )}

        {!offline && isPurpose && snapshot.recovery_status === 'HUMAN_HELP' && (
          <Focus title="Petugas akan membantu Anda secara langsung." description="Alur tetap pada pertanyaan yang sama sampai bantuan selesai.">
            <button className="button secondary" onClick={() => submitEvent('RECOVERY_RESUMED')}>Kembali ke pertanyaan</button>
          </Focus>
        )}

        {!offline && isPurpose && snapshot.recovery_status !== 'HUMAN_HELP' && inputMode === 'CAMERA' && (
          <CameraPreview onCancel={() => setInputMode('QUESTION')} onText={() => setInputMode('TEXT')} onHelp={requestHelp} />
        )}

        {!offline && isPurpose && snapshot.recovery_status !== 'HUMAN_HELP' && inputMode === 'TEXT' && (
          <section className="focus-content compact">
            <p className="eyebrow">Jawaban teks</p>
            <h1>Ketik jawaban Anda.</h1>
            <form className="stack-form" onSubmit={sendText}>
              <label htmlFor="answer-text">Jawaban untuk petugas</label>
              <textarea id="answer-text" value={text} maxLength={500} onChange={(event) => setText(event.target.value)} autoFocus />
              <div className="button-row"><button className="button primary" disabled={busy || !text.trim()}>Kirim</button><button className="button secondary" type="button" onClick={() => setInputMode('QUESTION')}>Kembali</button></div>
            </form>
          </section>
        )}

        {!offline && isPurpose && snapshot.recovery_status !== 'HUMAN_HELP' && inputMode === 'QUESTION' && (
          <section className="split-layout">
            <div className="question-pane">
              <p className="eyebrow">Pertanyaan petugas</p>
              <h1>{snapshot.active_question}</h1>
              <p className="guidance">Pilih cara menjawab yang paling nyaman. Jawaban isyarat dibatasi pada Ya, Tidak, atau Minta bantuan untuk pertanyaan ini.</p>
            </div>
            <div className="response-pane">
              {snapshot.recovery_status === 'UNKNOWN' && <p className="error-box">Isyarat belum dapat dipahami. Alur belum berubah.</p>}
              {snapshot.recovery_status === 'TEXT_FALLBACK' && snapshot.exact_text && <p className="success-box">Jawaban teks telah dikirim. Petugas akan mengklarifikasi dan melanjutkan alur.</p>}
              <button className="button primary large" onClick={() => setInputMode('CAMERA')}>Jawab dengan BISINDO</button>
              <button className="button secondary large" onClick={() => setInputMode('TEXT')}>Ketik jawaban</button>
              <button className="button quiet large" onClick={requestHelp}>Minta bantuan petugas</button>
            </div>
          </section>
        )}

        {!offline && snapshot.workflow_state === 'IDENTITY_DOCUMENT' && (
          <Focus title="Silakan tunjukkan KTP atau KK langsung kepada petugas." description="SAMBUT tidak memindai atau menyimpan dokumen Anda." />
        )}
        {!offline && snapshot.workflow_state === 'INSURANCE_DOCUMENT' && (
          <Focus title="Jika menggunakan JKN/BPJS, silakan tunjukkan identitas kepesertaan langsung kepada petugas." description="Tidak ada kamera atau pemeriksaan otomatis pada tahap ini." />
        )}
        {!offline && snapshot.workflow_state === 'NEXT_STEP' && (
          <Focus title="Ikuti arahan berikut dari petugas." description={snapshot.next_step ?? 'Menunggu petugas mengirim arahan.'}>
            {snapshot.next_step && !snapshot.next_step_acknowledged && <button className="button primary" onClick={() => submitEvent('NEXT_STEP_ACKNOWLEDGED')} disabled={busy}>Saya mengerti</button>}
            {snapshot.next_step_acknowledged && <p className="success-text">Arahan sudah diterima. Petugas akan menutup sesi.</p>}
          </Focus>
        )}
        {!offline && snapshot.workflow_state === 'COMPLETE' && (
          <Focus title="Pendaftaran selesai." description="Silakan mengikuti arahan petugas." />
        )}
      </main>
    </div>
  );
}

function Focus({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <section className="focus-content"><p className="eyebrow">Layanan SAMBUT</p><h1>{title}</h1><p className="lead">{description}</p>{children && <div className="button-row centered">{children}</div>}</section>;
}

function RoleMismatch({ leaveSession }: { leaveSession: () => void }) {
  return <main className="focus-page"><section className="focus-content compact"><h1>Sesi petugas sedang aktif</h1><p className="lead">Gunakan konteks browser lain untuk terminal pengguna.</p><button className="button secondary" onClick={leaveSession}>Tinggalkan sesi</button></section></main>;
}
