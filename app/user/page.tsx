'use client';

import React, { useState } from 'react';
import { SessionProvider, useSession } from '../lib/SessionContext';
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
    goToNextState,
  } = useSession();

  const [inputMode, setInputMode] = useState<'INITIAL' | 'CAMERA' | 'CONFIRMATION' | 'TYPING'>('INITIAL');
  const [detectedIntent, setDetectedIntent] = useState<UserIntent>('YA');
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0.88);

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
            <p className="text-base text-[#63736E] mb-8">
              Pemberitahuan telah dikirim ke terminal loket. Silakan tunggu sebentar, petugas akan mendatangi atau membantu Anda secara langsung.
            </p>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs font-semibold text-[#126B55]">
              Petugas loket sedang melihat notifikasi di layar desktop.
            </div>
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
            <p className="text-lg text-[#63736E] mb-8">
              Terima kasih. Silakan mengambil nomor antrean dan menunggu panggilan di <strong>Ruang Tunggu Poli Umum</strong>.
            </p>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs text-[#63736E]">
              Nomor antrean dan ringkasan layanan telah tersimpan di sistem loket.
            </div>
          </div>
        ) : session.role_status === 'WAITING' && session.workflow_state === 'START' ? (
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
                pairDevice(pairingCodeInput);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
                placeholder="misal: SMB-8821"
                className="w-full text-center text-2xl font-mono tracking-wider font-bold py-3 px-4 border border-[#D9E1DD] rounded-xl uppercase bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none"
                maxLength={8}
              />
              <button
                type="submit"
                className="w-full py-3 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Sambungkan Sesi
              </button>
            </form>

            <p className="text-[11px] text-[#63736E] mt-4">
              Kode bawaan pengujian: <strong className="font-mono text-[#126B55]">{session.session_id}</strong>
            </p>
          </div>
        ) : (
          /* Split Dual Panel: Video Question & Interactive Response */
          <div className="grid lg:grid-cols-12 gap-6 h-full items-stretch">
            {/* Left Column: Verified BISINDO Player + Question Text */}
            <div className="lg:col-span-6 flex flex-col">
              <BisindoPlayer
                questionText={stateConfig.questionText}
                signDescription={stateConfig.signDescription}
                videoUrl={stateConfig.bisindoVideoUrl}
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
                      Sesuai prinsip aksesibilitas, Anda dapat memperagakan bahasa isyarat BISINDO langsung di depan kamera atau menggunakan opsi pengetikan teks.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Primary BISINDO Sign Button */}
                    <button
                      onClick={() => setInputMode('CAMERA')}
                      className="w-full p-5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-lg rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">🤟</span>
                        <div className="text-left">
                          <span className="block font-bold">Jawab dengan BISINDO</span>
                          <span className="text-xs font-normal text-emerald-100">Kamera akan mengenali isyarat Anda secara otomatis</span>
                        </div>
                      </div>
                      <span className="text-xl">→</span>
                    </button>

                    {/* Secondary Typing Fallback Button */}
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
  return (
    <SessionProvider>
      <UserTerminalContent />
    </SessionProvider>
  );
}
