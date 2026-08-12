'use client';

import React, { useState } from 'react';
import { SessionProvider, useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import { BisindoPlayer } from '../components/BisindoPlayer';
import { CameraPreview } from '../components/CameraPreview';
import { MeaningConfirmation } from '../components/MeaningConfirmation';
import { TypingFallback } from '../components/TypingFallback';
import { UserIntent } from '../lib/types';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from '../lib/workflow';

function UserTerminalContent() {
  const {
    session,
    setUserIntent,
    confirmAnswerAndAdvance,
    requestHumanHelp,
    resumeFromHelp,
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
    const textToConfirm = session.user_confirmed_text || INTENT_TRANSLATIONS[detectedIntent]?.labelText || detectedIntent;
    confirmAnswerAndAdvance(textToConfirm);
    setInputMode('INITIAL');
  };

  const handleTypingSubmit = (text: string) => {
    confirmAnswerAndAdvance(text);
    setInputMode('INITIAL');
  };

  const isPhysicalDocumentState = session.workflow_state === 'IDENTITY' || session.workflow_state === 'INSURANCE';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="user" />

      {/* Main Tablet Canvas - 1440x900 / 10-11" Landscape Contract */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        {session.need_human_help ? (
          /* Human Help Escalation Screen with Resume Button */
          <div className="bg-white rounded-2xl border border-amber-200 p-10 text-center max-w-2xl mx-auto shadow-md space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto">
              💁‍♂️
            </div>
            <div>
              <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-3">
                Petugas Akan Membantu Anda
              </h2>
              <p className="text-base text-[#63736E] leading-relaxed">
                Pemberitahuan telah dikirim ke terminal loket. Petugas akan mendatangi tablet Anda untuk membantu pendaftaran.
              </p>
            </div>

            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs font-semibold text-[#126B55]">
              Petugas loket telah menerima panggilan di layar loket.
            </div>

            <button
              onClick={resumeFromHelp}
              className="w-full py-4 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-base rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>✓</span>
              <span>Bantuan Petugas Selesai — Kembali ke Pertanyaan</span>
            </button>
          </div>
        ) : session.workflow_state === 'COMPLETED' ? (
          /* Completion Screen (Manual Reset by Staff ONLY) */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-12 text-center max-w-2xl mx-auto shadow-md space-y-6">
            <div className="w-20 h-20 bg-[#16734E]/10 text-[#16734E] rounded-full flex items-center justify-center text-4xl mx-auto">
              🎉
            </div>
            <div>
              <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-2">
                Pendaftaran Selesai
              </h2>
              <p className="text-base text-[#63736E]">
                Terima kasih. Silakan mengambil nomor antrean dan menunggu panggilan di <strong>Ruang Tunggu Poli Umum</strong>.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#16734E]"></span>
              <span className="text-sm font-semibold text-[#126B55]">
                Pendaftaran Berhasil Dicatat • Petugas Loket Akan Meriset Sesi Pasien
              </span>
            </div>
          </div>
        ) : session.workflow_state === 'START' ? (
          /* Step Persiapan Sesi: Pasien Hanya Menunggu Petugas Memulai Sesi */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-12 text-center max-w-xl mx-auto w-full shadow-xs">
            <div className="w-20 h-20 bg-[#126B55]/10 text-[#126B55] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
              🤟
            </div>
            <h2 className="font-heading font-bold text-3xl text-[#13231F] mb-3">
              SAMBUT Siap Digunakan
            </h2>
            <p className="text-base text-[#63736E] mb-8 leading-relaxed">
              Silakan tunggu petugas di loket untuk memulai sesi pertanyaan pendaftaran Anda.
            </p>

            <div className="p-5 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#16734E] animate-ping"></span>
              <span className="text-sm font-semibold text-[#126B55]">
                Perangkat Terhubung • Menunggu Petugas Loket Memulai...
              </span>
            </div>
          </div>
        ) : session.workflow_state === 'WAITING_STAFF_QUESTION' ? (
          /* Waiting Screen while staff decides whether to ask a follow-up question via voice STT */
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-10 shadow-xs text-center max-w-xl mx-auto w-full space-y-6">
            <div className="w-16 h-16 bg-[#126B55]/10 text-[#126B55] rounded-2xl flex items-center justify-center text-3xl mx-auto">
              ⏳
            </div>
            <div>
              <h3 className="font-heading font-bold text-2xl text-[#13231F] mb-2">
                Menunggu Pertanyaan Petugas
              </h3>
              <p className="text-sm text-[#63736E]">
                Silakan tunggu sejenak, petugas loket sedang menentukan apakah ada pertanyaan tambahan untuk Anda.
              </p>
            </div>
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#126B55] animate-ping"></span>
              <span className="text-xs font-semibold text-[#126B55]">
                Terhubung ke Layar Loket Petugas...
              </span>
            </div>
          </div>
        ) : (
          /* Split Dual Panel: Video Question & Interactive Response */
          <div className="grid lg:grid-cols-12 gap-6 h-full items-stretch">
            {/* Left Column: Verified BISINDO Player + Question Text */}
            <div className="lg:col-span-6 flex flex-col">
              <BisindoPlayer
                questionText={session.current_question?.text || stateConfig.questionText}
                signDescription={stateConfig.signDescription}
                videoUrl={stateConfig.bisindoVideoUrl}
              />
            </div>

            {/* Right Column: Dynamic Input Channel */}
            <div className="lg:col-span-6 flex flex-col">
              {isPhysicalDocumentState ? (
                /* Physical Document Waiting Screen (KTP / BPJS) */
                <div className="bg-white rounded-xl border border-[#D9E1DD] p-8 shadow-xs flex flex-col justify-between h-full text-center">
                  <div>
                    <div className="w-16 h-16 bg-[#126B55]/10 text-[#126B55] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
                      {session.workflow_state === 'IDENTITY' ? '🪪' : '💳'}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55] mb-2 block">
                      {session.workflow_state === 'IDENTITY' ? 'Pemeriksaan KTP / KK' : 'Pemeriksaan Kartu BPJS'}
                    </span>
                    <h3 className="font-heading font-bold text-2xl text-[#13231F] mb-3">
                      Tunjukkan Dokumen Fisik Ke Petugas
                    </h3>
                    <p className="text-sm text-[#63736E] leading-relaxed mb-6">
                      {session.workflow_state === 'IDENTITY'
                        ? 'Silakan serahkan KTP atau KK Anda secara langsung kepada petugas loket.'
                        : 'Jika menggunakan JKN / BPJS Kesehatan, silakan serahkan kartu kepada petugas loket.'}
                    </p>
                  </div>

                  <div className="p-6 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-[#126B55] font-semibold text-sm">
                      <span className="w-3 h-3 rounded-full bg-[#126B55] animate-ping"></span>
                      <span>Menunggu Konfirmasi Petugas Loket...</span>
                    </div>
                    <p className="text-xs text-[#63736E]">
                      Petugas akan memeriksa dan mengonfirmasi dokumen di terminal loket untuk melanjutkan alur pendaftaran.
                    </p>
                  </div>
                </div>
              ) : inputMode === 'CAMERA' ? (
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
                      Langkah {WORKFLOW_STATES[session.workflow_state]?.title || 'Pertanyaan'}
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
