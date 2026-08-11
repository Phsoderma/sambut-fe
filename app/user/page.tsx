'use client';

import React, { useState } from 'react';
import { useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import { BisindoPlayer } from '../components/BisindoPlayer';
import { CameraPreview } from '../components/CameraPreview';
import { MeaningConfirmation } from '../components/MeaningConfirmation';
import { TypingFallback } from '../components/TypingFallback';
import { UserIntent } from '../lib/types';
import { WORKFLOW_STATES } from '../lib/workflow';

function UserTerminalContent() {
  const {
    session,
    pairingCodeInput,
    setPairingCodeInput,
    pairDevice,
    setUserIntent,
    confirmAnswer,
    requestHumanHelp,
    resumeFromHelp,
    goToNextState,
    setWorkflowState,
    resetSession,
    startNextPatient,
    submitKtpForVerification,
    retryKtpVerification,
  } = useSession();

  const [inputMode, setInputMode] = useState<'INITIAL' | 'CAMERA' | 'CONFIRMATION' | 'TYPING'>('INITIAL');
  const [detectedIntent, setDetectedIntent] = useState<UserIntent>('YA');
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0.88);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<number>(5);

  // Auto redirect timer when workflow_state reaches COMPLETED
  React.useEffect(() => {
    if (session.workflow_state !== 'COMPLETED') return;
    setAutoRedirectTimer(5);

    const interval = setInterval(() => {
      setAutoRedirectTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startNextPatient();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.workflow_state, startNextPatient]);

  const stateConfig = WORKFLOW_STATES[session.workflow_state] || WORKFLOW_STATES.START;

  const handleCaptureDone = (intent: UserIntent, confidence: number) => {
    setDetectedIntent(intent);
    setDetectedConfidence(confidence);
    setUserIntent(intent, confidence);
    setInputMode('CONFIRMATION');
  };

  const handleConfirmAnswer = () => {
    confirmAnswer(detectedIntent);
    setInputMode('INITIAL');
    goToNextState();
  };

  const handleTypingSubmit = (text: string) => {
    confirmAnswer(text);
    setInputMode('INITIAL');
    goToNextState();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="user" />

      {/* Main Tablet Canvas - 1440x900 / 10-11" Landscape Contract */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        {session.need_human_help ? (
          /* Human Help Escalation Screen */
          <div className="bg-white rounded-2xl border border-amber-200 p-12 text-center max-w-2xl mx-auto shadow-md">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              💁‍♂️
            </div>
            <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-3">
              Petugas Akan Membantu Anda
            </h2>
            <p className="text-base text-[#63736E] mb-6">
              Pemberitahuan telah dikirim ke terminal loket. Silakan tunggu sebentar, petugas akan mendatangi atau membantu Anda secara langsung.
            </p>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs font-semibold text-[#126B55] mb-6">
              Petugas loket sedang melihat notifikasi di layar desktop.
            </div>

            {/* Resume Option after Staff Arrives */}
            <button
              onClick={resumeFromHelp}
              className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>✅</span>
              <span>Petugas Sudah Datang — Lanjutkan ke Pertanyaan Barusan</span>
            </button>
          </div>
        ) : session.workflow_state === 'IDENTITY' && session.ktp_verification_status === 'PENDING' ? (
          /* KTP Verification Pending Loading Screen */
          <div className="bg-white rounded-2xl border border-emerald-300 p-12 text-center max-w-xl mx-auto shadow-md animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
              ⌛
            </div>
            <h2 className="font-heading font-bold text-2xl text-[#13231F] mb-3">
              Menunggu Verifikasi KTP dari Petugas
            </h2>
            <p className="text-sm text-[#63736E] mb-8 leading-relaxed">
              Foto fisik KTP Anda telah terkirim ke Loket Petugas. Mohon tunggu sebentar, petugas sedang memeriksa dokumen identitas Anda...
            </p>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs font-semibold text-[#126B55] flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#126B55] animate-ping"></span>
              <span>Status: Menunggu ACC Petugas Loket</span>
            </div>
          </div>
        ) : session.workflow_state === 'IDENTITY' && session.ktp_verification_status === 'REJECTED' ? (
          /* KTP Verification Rejected Screen */
          <div className="bg-white rounded-2xl border border-red-200 p-10 text-center max-w-xl mx-auto shadow-md animate-fadeIn">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ❌
            </div>
            <h2 className="font-heading font-bold text-2xl text-red-900 mb-2">
              Dokumen KTP Perlu Diulangi
            </h2>
            <p className="text-xs text-red-700 mb-6 leading-relaxed">
              Petugas mendeteksi foto KTP kurang jelas atau belum sesuai. Silakan posisikan kembali KTP di depan kamera dan lakukan pemindaian ulang.
            </p>
            <button
              onClick={() => {
                retryKtpVerification();
                setInputMode('CAMERA');
              }}
              className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🪪</span>
              <span>Pindai Ulang Dokumen KTP</span>
            </button>
          </div>
        ) : session.workflow_state === 'COMPLETED' ? (
          /* Completion Screen */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-12 text-center max-w-2xl mx-auto shadow-md">
            <div className="w-20 h-20 bg-[#16734E]/10 text-[#16734E] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              🎉
            </div>
            <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-3">
              Pendaftaran Selesai
            </h2>
            <p className="text-lg text-[#63736E] mb-6">
              Terima kasih. Silakan mengambil nomor antrean dan menunggu panggilan di <strong>Ruang Tunggu Poli Umum</strong>.
            </p>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs text-[#63736E] mb-6">
              Nomor antrean dan ringkasan layanan telah tersimpan di sistem loket.
            </div>

            <div className="space-y-3">
              <button
                onClick={startNextPatient}
                className="w-full py-4 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-base rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>➡️</span>
                <span>Lanjut Pasien Berikutnya ({autoRedirectTimer}s)</span>
              </button>
              <p className="text-xs text-[#63736E]">
                Layar akan otomatis kembali ke &quot;SAMBUT Siap Digunakan&quot; dalam <strong>{autoRedirectTimer} detik</strong>.
              </p>
            </div>
          </div>
        ) : session.role_status === 'WAITING' ? (
          /* Session Pairing Code Entry Screen */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-10 max-w-md mx-auto w-full shadow-xs text-center">
            <div className="w-14 h-14 bg-[#126B55]/10 text-[#126B55] rounded-xl flex items-center justify-center text-3xl mx-auto mb-4">
              🔑
            </div>
            <h2 className="font-heading font-bold text-2xl text-[#13231F] mb-2">
              Hubungkan Tablet Pasien
            </h2>
            <p className="text-xs text-[#63736E] mb-6">
              Masukkan Kode Sesi 4-digit yang tertera pada layar Terminal Loket Petugas.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const success = pairDevice(pairingCodeInput);
                if (!success) {
                  setPairingError('Kode Sesi salah atau tidak ditemukan. Mohon periksa kembali kode pada layar Loket Petugas.');
                } else {
                  setPairingError(null);
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={pairingCodeInput}
                onChange={(e) => {
                  setPairingCodeInput(e.target.value.toUpperCase());
                  setPairingError(null);
                }}
                placeholder="masukkan kode sesi"
                className={`w-full text-center text-2xl font-mono tracking-wider font-bold py-3 px-4 border rounded-xl uppercase bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none ${
                  pairingError ? 'border-red-400 focus:ring-red-500 bg-red-50/50' : 'border-[#D9E1DD]'
                }`}
                maxLength={8}
              />

              {pairingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-left flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <span>{pairingError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Sambungkan Sesi
              </button>
            </form>
          </div>
        ) : session.workflow_state === 'START' ? (
          /* Active Opening / Welcome Screen ("SAMBUT Siap Digunakan") */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-[#126B55]/10 text-[#126B55] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
              🤟
            </div>
            <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-3">
              SAMBUT Siap Digunakan
            </h2>
            <p className="text-base text-[#63736E] mb-8 leading-relaxed">
              Sesi pendaftaran telah aktif dan terhubung ke Loket Petugas. Silakan tekan tombol di bawah untuk memulai pendaftaran.
            </p>
            <button
              onClick={() => setWorkflowState('PATIENT_STATUS')}
              className="w-full py-4 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Lanjutkan</span>
              <span>→</span>
            </button>
          </div>
        ) : (
          /* Split Dual Panel: Question Display & Interactive Response */
          <div className="grid lg:grid-cols-12 gap-6 h-full items-stretch">
            {/* Left Column: Live Question Display (No video peragaan) */}
            <div className="lg:col-span-6 flex flex-col">
              <BisindoPlayer
                questionText={session.current_question.text || stateConfig.questionText}
                signDescription={session.current_question.sign_description || stateConfig.signDescription}
              />
            </div>

            {/* Right Column: Dynamic Input Channel (Ready, Camera, Confirmation, Typing) */}
            <div className="lg:col-span-6 flex flex-col">
              {inputMode === 'CAMERA' ? (
                <CameraPreview
                  onCaptureDone={handleCaptureDone}
                  onCancel={() => setInputMode('INITIAL')}
                />
              ) : inputMode === 'CONFIRMATION' ? (
                <MeaningConfirmation
                  intent={detectedIntent}
                  confidence={detectedConfidence}
                  confidenceBand={session.confidence_band}
                  onConfirm={handleConfirmAnswer}
                  onRetry={() => setInputMode('CAMERA')}
                  onTypeFallback={() => setInputMode('TYPING')}
                />
              ) : inputMode === 'TYPING' ? (
                <TypingFallback
                  onSubmitText={handleTypingSubmit}
                  onCancel={() => setInputMode('INITIAL')}
                  onLiveTextChange={(liveText) => {
                    if (liveText && liveText.trim().length > 0) {
                      confirmAnswer(liveText);
                    }
                  }}
                />
              ) : (
                /* INITIAL Action Selection Mode */
                <div className="bg-white rounded-xl border border-[#D9E1DD] p-8 shadow-xs flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55] mb-2 block">
                      Langkah {WORKFLOW_STATES[session.workflow_state]?.title}
                    </span>
                    <h3 className="font-heading font-bold text-2xl text-[#13231F] mb-3">
                      Pilih Kanal Jawaban Anda
                    </h3>
                    <p className="text-xs text-[#63736E] leading-relaxed mb-6">
                      {session.workflow_state === 'IDENTITY'
                        ? 'Khusus pemeriksaan identitas, mohon tunjukkan fisik KTP, KK, atau identitas diri ke kamera tablet.'
                        : 'Sesuai prinsip aksesibilitas, Anda dapat memperagakan bahasa isyarat BISINDO langsung di depan kamera atau menggunakan opsi pengetikan teks.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Primary Camera Button (Sign or KTP Scan) */}
                    <button
                      onClick={() => setInputMode('CAMERA')}
                      className="w-full p-5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-lg rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                          {session.workflow_state === 'IDENTITY' ? '🪪' : '🤟'}
                        </span>
                        <div className="text-left">
                          <span className="block font-bold">
                            {session.workflow_state === 'IDENTITY'
                              ? 'Tunjukkan & Kirim KTP ke Petugas'
                              : 'Jawab dengan BISINDO'}
                          </span>
                          <span className="text-xs font-normal text-emerald-100">
                            {session.workflow_state === 'IDENTITY'
                              ? 'Pindai KTP fisik Anda dan kirimkan ke layar loket petugas'
                              : 'Kamera akan mengenali isyarat Anda secara otomatis'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xl">→</span>
                    </button>

                    {/* Additional Camera Preview Option for IDENTITY */}
                    {session.workflow_state === 'IDENTITY' && (
                      <button
                        onClick={() => setInputMode('CAMERA')}
                        className="w-full p-3.5 bg-[#F8FAF9] hover:bg-gray-100 text-[#13231F] font-heading font-semibold text-xs rounded-xl border border-[#D9E1DD] transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">📹</span>
                          <span>Buka Preview Kamera Tablet</span>
                        </div>
                        <span className="text-xs text-[#63736E]">Atur Bingkai Dokumen</span>
                      </button>
                    )}

                    {/* Secondary Typing Fallback Button (Hidden for IDENTITY step as required) */}
                    {session.workflow_state !== 'IDENTITY' && (
                      <button
                        onClick={() => setInputMode('TYPING')}
                        className="w-full p-4 bg-[#F8FAF9] hover:bg-gray-100 text-[#13231F] font-heading font-semibold text-sm rounded-xl border border-[#D9E1DD] transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⌨️</span>
                          <span>Ketik Jawaban Teks</span>
                        </div>
                        <span className="text-xs text-[#63736E]">Gunakan Keyboard</span>
                      </button>
                    )}

                    {/* Escalation Human Help Button */}
                    <button
                      onClick={requestHumanHelp}
                      className="w-full py-3 text-[#B42318] hover:bg-red-50 text-xs font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>💬</span>
                      <span>Minta Bantuan Petugas Loket</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function UserTerminalPage() {
  return <UserTerminalContent />;
}
