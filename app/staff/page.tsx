'use client';

import { FormEvent, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Header } from '../components/Header';
import { useSession } from '../lib/SessionContext';
import { staffStateId } from '../lib/stateMap';

const STATE_LABELS = {
  SESSION_START: 'Sesi siap',
  PURPOSE_TREATMENT_CHECK: 'Pertanyaan tujuan berobat',
  PURPOSE_REFERRAL_CHECK: 'Pertanyaan rujukan',
  PURPOSE_ADMIN_CHECK: 'Pertanyaan surat atau dokumen',
  IDENTITY_DOCUMENT: 'Dokumen identitas',
  INSURANCE_DOCUMENT: 'JKN / BPJS',
  NEXT_STEP: 'Arahan berikutnya',
  COMPLETE: 'Sesi selesai',
};

export default function StaffPage() {
  const {
    credentials,
    snapshot,
    connection,
    error,
    busy,
    createStaffSession,
    submitEvent,
    reconnectNow,
    leaveSession,
  } = useSession();
  const [instruction, setInstruction] = useState('Silakan menunggu di Ruang Tunggu Poli Umum.');
  const [dictationMessage, setDictationMessage] = useState('');

  if (!snapshot || !credentials) {
    return (
      <div className="app-shell">
        <Header role="staff" />
        <main className="focus-page">
          <section className="focus-content compact">
            <p className="eyebrow">Terminal petugas</p>
            <h1>Buat sesi layanan</h1>
            <p className="lead">Kode sesi akan dipakai pengguna untuk terhubung dari perangkat lain.</p>
            {error && <p className="error-box" role="alert">{error}</p>}
            <button className="button primary large" onClick={createStaffSession} disabled={busy}>Buat sesi</button>
          </section>
        </main>
      </div>
    );
  }

  if (credentials.role !== 'STAFF') {
    return <RoleMismatch leaveSession={leaveSession} />;
  }

  const offline = connection === 'DISCONNECTED';
  const stateId = staffStateId(snapshot.workflow_state, snapshot.recovery_status, !offline);
  const patientUrlObject = new URL('/user', window.location.origin);
  patientUrlObject.searchParams.set('session', credentials.sessionId);
  patientUrlObject.searchParams.set('code', credentials.joinCode ?? '');
  const patientUrl = patientUrlObject.toString();

  const startDictation = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => { lang: string; interimResults: boolean; start: () => void; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onerror: () => void };
      webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; start: () => void; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onerror: () => void };
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setDictationMessage('Dikte tidak didukung di peramban ini. Ketik arahan secara manual.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setInstruction(transcript);
      setDictationMessage('Tinjau hasil dikte sebelum mengirim.');
    };
    recognition.onerror = () => setDictationMessage('Dikte gagal. Ketik arahan secara manual.');
    recognition.start();
  };

  const sendInstruction = (event: FormEvent) => {
    event.preventDefault();
    submitEvent('NEXT_STEP_SENT', { instruction });
  };

  return (
    <div className="app-shell">
      <Header role="staff" />
      <main className="operational-page">
        <aside className="session-panel" aria-label="Informasi sesi">
          <p className="eyebrow">Sesi aktif</p>
          <dl>
            <div><dt>ID sesi</dt><dd>{credentials.sessionId}</dd></div>
            <div><dt>Kode sambung</dt><dd className="join-code">{credentials.joinCode}</dd></div>
            <div><dt>Pengguna</dt><dd>{snapshot.user_connected ? 'Terhubung' : 'Menunggu'}</dd></div>
            <div><dt>Status</dt><dd>{STATE_LABELS[snapshot.workflow_state]}</dd></div>
            <div><dt>Pasien</dt><dd>Nomor {snapshot.encounter_number}</dd></div>
          </dl>
          <button className="button secondary" onClick={() => window.open(patientUrl, '_blank', 'noopener,noreferrer')}>Buka Terminal Pengguna</button>
          <div className="pair-qr">
            <QRCodeSVG value={patientUrl} size={148} level="M" marginSize={2} title="QR pairing terminal pengguna" />
            <p>Pindai dari tablet pengguna</p>
          </div>
          <p className="pair-link">Tautan pairing: <a href={patientUrl} target="_blank" rel="noreferrer">{patientUrl}</a></p>
          <button className="button quiet" onClick={leaveSession}>Tinggalkan sesi di perangkat ini</button>
        </aside>

        <section className="operation-panel" aria-live="polite">
          <div className="operation-heading">
            <div>
              <p className="eyebrow">{stateId} · Alur layanan</p>
              <h1>{STATE_LABELS[snapshot.workflow_state]}</h1>
            </div>
            <span className="version">Versi {snapshot.version}</span>
          </div>

          {offline && (
            <div className="error-box"><p>Koneksi terputus. Status tidak akan diubah.</p><button className="button secondary" onClick={reconnectNow}>Coba lagi</button></div>
          )}
          {error && !offline && <p className="error-box" role="alert">{error}</p>}

          {snapshot.workflow_state === 'SESSION_START' && (
            <Task title="Pengguna siap menerima pertanyaan pertama" description="Mulai setelah terminal pengguna tersambung.">
              <button className="button primary" disabled={busy || !snapshot.user_connected} onClick={() => submitEvent('QUESTION_SENT_TREATMENT')}>Kirim pertanyaan berobat</button>
            </Task>
          )}

          {snapshot.workflow_state.startsWith('PURPOSE_') && (
            <Task title={snapshot.active_question ?? 'Pertanyaan tujuan kunjungan'} description="Jawaban isyarat hanya berlaku untuk pertanyaan aktif ini.">
              {snapshot.recovery_status === 'HUMAN_HELP' && (
                <div className="attention"><strong>Pengguna meminta bantuan langsung.</strong><button className="button secondary" onClick={() => submitEvent('RECOVERY_RESUMED')}>Lanjutkan pertanyaan</button></div>
              )}
              {snapshot.exact_text ? (
                <div className="manual-response">
                  <p>Jawaban teks pengguna</p><blockquote>{snapshot.exact_text}</blockquote>
                  <p className="guidance">Petugas menetapkan tujuan secara eksplisit setelah mengklarifikasi jawaban.</p>
                  <div className="button-row">
                    <button className="button secondary" onClick={() => submitEvent('STAFF_MANUAL_RESPONSE_ACCEPTED', { purpose: 'TREATMENT' })}>Berobat</button>
                    <button className="button secondary" onClick={() => submitEvent('STAFF_MANUAL_RESPONSE_ACCEPTED', { purpose: 'REFERRAL' })}>Rujukan</button>
                    <button className="button secondary" onClick={() => submitEvent('STAFF_MANUAL_RESPONSE_ACCEPTED', { purpose: 'ADMIN_DOCUMENT' })}>Surat / dokumen</button>
                  </div>
                </div>
              ) : (
                <p className="waiting-line">{snapshot.recovery_status === 'UNKNOWN' ? 'Isyarat belum dipahami; alur tetap pada pertanyaan ini.' : 'Menunggu jawaban pengguna…'}</p>
              )}
            </Task>
          )}

          {snapshot.workflow_state === 'IDENTITY_DOCUMENT' && (
            <Task title="Amati dokumen fisik" description="SAMBUT tidak memindai atau menyimpan KTP/KK.">
              <div className="button-row">
                <button className="button primary" onClick={() => submitEvent('IDENTITY_DOCUMENT_RECEIVED')}>Dokumen diterima</button>
                <button className="button secondary" onClick={() => submitEvent('IDENTITY_DOCUMENT_UNAVAILABLE')}>Dokumen tidak tersedia</button>
              </div>
            </Task>
          )}

          {snapshot.workflow_state === 'INSURANCE_DOCUMENT' && (
            <Task title="Amati identitas kepesertaan bila digunakan" description="Tidak ada kamera, OCR, atau klasifikasi kartu.">
              <div className="button-row">
                <button className="button primary" onClick={() => submitEvent('INSURANCE_RECEIVED')}>JKN / BPJS diterima</button>
                <button className="button secondary" onClick={() => submitEvent('INSURANCE_NOT_USED')}>Tidak digunakan</button>
              </div>
            </Task>
          )}

          {snapshot.workflow_state === 'NEXT_STEP' && (
            <Task title="Kirim arahan berikutnya" description="Pengguna harus menyatakan sudah memahami sebelum sesi ditutup.">
              {!snapshot.next_step ? (
                <form className="stack-form" onSubmit={sendInstruction}>
                  <label htmlFor="next-step">Arahan untuk pengguna</label>
                  <textarea id="next-step" value={instruction} maxLength={500} onChange={(event) => setInstruction(event.target.value)} />
                  <button className="button secondary" type="button" onClick={startDictation}>Dikte arahan</button>
                  {dictationMessage && <p className="guidance" role="status">{dictationMessage}</p>}
                  <button className="button primary" disabled={busy || !instruction.trim()}>Kirim arahan</button>
                </form>
              ) : (
                <div className="instruction-preview">
                  <p>{snapshot.next_step}</p>
                  {snapshot.next_step_acknowledged
                    ? <button className="button primary" onClick={() => submitEvent('SESSION_COMPLETED')}>Tutup sesi</button>
                    : <span className="waiting-line">Menunggu pengguna menyatakan sudah memahami…</span>}
                </div>
              )}
            </Task>
          )}

          {snapshot.workflow_state === 'COMPLETE' && (
            <Task title="Pendaftaran selesai" description="Sesi mencapai COMPLETE setelah arahan diterima pengguna.">
              <p className="success-text">Alur layanan selesai tanpa menyimpan video atau data dokumen.</p>
              <button className="button primary" disabled={busy} onClick={() => submitEvent('NEXT_PATIENT_STARTED')}>Pasien Berikutnya</button>
            </Task>
          )}
        </section>
      </main>
    </div>
  );
}

function Task({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="task-block"><h2>{title}</h2><p className="guidance">{description}</p><div className="task-actions">{children}</div></div>;
}

function RoleMismatch({ leaveSession }: { leaveSession: () => void }) {
  return <main className="focus-page"><section className="focus-content compact"><h1>Sesi pengguna sedang aktif</h1><p className="lead">Tinggalkan sesi pengguna sebelum membuka terminal petugas.</p><button className="button secondary" onClick={leaveSession}>Tinggalkan sesi</button></section></main>;
}
