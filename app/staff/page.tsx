'use client';

import React, { useState } from 'react';
import { SessionProvider, useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from '../lib/workflow';
import { WorkflowState } from '../lib/types';

function StaffTerminalContent() {
  const {
    session,
    startRegistrationByStaff,
    goToNextState,
    goToPreviousState,
    setWorkflowState,
    sendCustomQuestion,
    finishStaffCustomQuestions,
    confirmKtpDoc,
    confirmBpjsDoc,
    resumeFromHelp,
    resetSession,
    startNextPatient,
  } = useSession();

  const [speechText, setSpeechText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const currentConfig = WORKFLOW_STATES[session.workflow_state];

  // Voice STT is unlocked ONLY after reaching DESTINATION, WAITING_STAFF_QUESTION, or CUSTOM_QUESTION
  const isVoiceSttUnlocked =
    session.workflow_state === 'DESTINATION' ||
    session.workflow_state === 'WAITING_STAFF_QUESTION' ||
    session.workflow_state === 'CUSTOM_QUESTION';

  // Speech Recognition integration (Web Speech API) - Fills text input ONLY
  const handleToggleMic = () => {
    if (!isVoiceSttUnlocked) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const windowWithSpeech = window as unknown as {
      webkitSpeechRecognition?: new () => any;
      SpeechRecognition?: new () => any;
    };

    const SpeechRecognitionCtor = windowWithSpeech.webkitSpeechRecognition || windowWithSpeech.SpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechError('Web Speech API tidak didukung di browser ini. Gunakan input manual di bawah.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setSpeechError('Gagal mendengarkan suara. Silakan ketik pertanyaan di bawah.');
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Staff explicitly clicks "Kirim Pertanyaan" button to form & send custom question
  const handleSendCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechText.trim() || !isVoiceSttUnlocked) return;
    sendCustomQuestion(speechText);
    setSpeechText('');
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Build dynamic horizontal stepper including dynamic custom questions
  const customQuestions = session.custom_questions_list || [];
  const baseStepKeysBefore: WorkflowState[] = ['START', 'PATIENT_STATUS', 'IDENTITY', 'INSURANCE', 'DESTINATION'];
  const customStepKeys: { key: string; label: string; state: WorkflowState }[] = customQuestions.map((item, idx) => ({
    key: `custom_${idx}`,
    label: `Pertanyaan Tambahan ${idx + 1}`,
    state: 'CUSTOM_QUESTION',
  }));
  if (session.workflow_state === 'WAITING_STAFF_QUESTION' && customQuestions.length === 0) {
    // waiting state
  }

  const allStepperItems: { key: string; label: string; state: WorkflowState }[] = [
    { key: 'START', label: WORKFLOW_STATES.START.title, state: 'START' },
    { key: 'PATIENT_STATUS', label: WORKFLOW_STATES.PATIENT_STATUS.title, state: 'PATIENT_STATUS' },
    { key: 'IDENTITY', label: WORKFLOW_STATES.IDENTITY.title, state: 'IDENTITY' },
    { key: 'INSURANCE', label: WORKFLOW_STATES.INSURANCE.title, state: 'INSURANCE' },
    { key: 'DESTINATION', label: WORKFLOW_STATES.DESTINATION.title, state: 'DESTINATION' },
    ...customStepKeys,
    ...(session.workflow_state === 'WAITING_STAFF_QUESTION'
      ? [{ key: 'WAITING_STAFF_QUESTION', label: WORKFLOW_STATES.WAITING_STAFF_QUESTION.title, state: 'WAITING_STAFF_QUESTION' as WorkflowState }]
      : []),
    { key: 'CONFIRM', label: WORKFLOW_STATES.CONFIRM.title, state: 'CONFIRM' },
    { key: 'COMPLETED', label: WORKFLOW_STATES.COMPLETED.title, state: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="staff" />

      {/* Main Staff Desktop Layout - 1440x900 Contract */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Horizontal Stepper Alur Pendaftaran Ke Samping */}
        <div className="bg-white rounded-xl border border-[#D9E1DD] p-5 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#126B55] text-lg font-bold">📋</span>
              <h2 className="font-heading font-bold text-base text-[#13231F]">
                Alur Pendaftaran Puskesmas (Horizontal Stepper)
              </h2>
            </div>
            <button
              onClick={resetSession}
              className="text-xs text-[#63736E] hover:text-[#B42318] underline font-medium cursor-pointer"
            >
              Reset / Pasien Berikutnya
            </button>
          </div>

          {/* Horizontal Stepper Track */}
          <div className="flex items-center gap-2 min-w-[850px]">
            {allStepperItems.map((stepItem, idx) => {
              const isActive = session.workflow_state === stepItem.state;
              const activeIndex = allStepperItems.findIndex((i) => i.state === session.workflow_state);
              const isPast = activeIndex > idx;

              return (
                <React.Fragment key={stepItem.key}>
                  <button
                    onClick={() => setWorkflowState(stepItem.state)}
                    className={`flex-1 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#126B55] text-white border-[#126B55] shadow-xs'
                        : isPast
                        ? 'bg-[#F8FAF9] text-[#126B55] border-emerald-200'
                        : 'bg-[#F8FAF9] text-[#63736E] border-[#D9E1DD] hover:border-[#126B55]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold opacity-80">STEP 0{idx + 1}</span>
                      {isPast && <span className="text-xs font-bold">✓</span>}
                    </div>
                    <span className="text-xs font-heading font-bold block truncate">
                      {stepItem.label}
                    </span>
                  </button>
                  {idx < allStepperItems.length - 1 && (
                    <span className="text-[#D9E1DD] font-bold text-sm shrink-0">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Split Grid (7 cols Left / 5 cols Right) */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Active Question & Push-to-Talk */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Question / Session Control Box */}
            <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#126B55] uppercase tracking-wider">
                  Pertanyaan Aktif Pada Tablet Pasien
                </span>
                <span className="text-xs font-mono bg-[#F8FAF9] px-2 py-0.5 rounded border border-[#D9E1DD] text-[#63736E]">
                  State: {session.workflow_state}
                </span>
              </div>

              <p className="font-heading font-bold text-2xl text-[#13231F] mb-4">
                {session.current_question?.text || currentConfig?.questionText}
              </p>

              {/* Start Registration Button when in START state */}
              {session.workflow_state === 'START' && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4 text-center">
                  <p className="text-xs text-emerald-900 font-semibold">
                    Tablet pasien saat ini menampilkan layar menunggu. Klik tombol di bawah untuk memulai pertanyaan pendaftaran:
                  </p>
                  <button
                    onClick={startRegistrationByStaff}
                    className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>▶️</span>
                    <span>Mulai Sesi Pendaftaran Pasien</span>
                  </button>
                </div>
              )}

              {/* Controls for Physical Document Verification */}
              {session.workflow_state === 'IDENTITY' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4">
                  <span className="text-xs font-bold text-emerald-900 block">
                    Konfirmasi Pemeriksaan KTP / KK Fisik Pasien:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmKtpDoc('RECEIVED')}
                      className="py-3 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      ✓ Dokumen KTP/KK Diterima
                    </button>
                    <button
                      onClick={() => confirmKtpDoc('NOT_AVAILABLE')}
                      className="py-3 bg-white text-[#13231F] border border-[#D9E1DD] hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      ✗ Dokumen Tidak Tersedia
                    </button>
                  </div>
                </div>
              )}

              {session.workflow_state === 'INSURANCE' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4">
                  <span className="text-xs font-bold text-emerald-900 block">
                    Konfirmasi Pemeriksaan Kartu BPJS / JKN Fisik Pasien:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmBpjsDoc('RECEIVED')}
                      className="py-3 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      ✓ Kartu BPJS Diterima
                    </button>
                    <button
                      onClick={() => confirmBpjsDoc('NOT_USED')}
                      className="py-3 bg-white text-[#13231F] border border-[#D9E1DD] hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      ✗ Pasien Umum (Tanpa BPJS)
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons during WAITING_STAFF_QUESTION or CUSTOM_QUESTION state */}
              {(session.workflow_state === 'WAITING_STAFF_QUESTION' || session.workflow_state === 'CUSTOM_QUESTION') && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4">
                  <p className="text-xs font-bold text-emerald-900">
                    Sesi Pertanyaan Langsung Petugas Aktif:
                  </p>
                  <p className="text-xs text-emerald-800">
                    Gunakan panel Voice STT di bawah untuk bertanya, atau klik tombol di bawah jika tidak ada pertanyaan lagi:
                  </p>
                  <button
                    onClick={finishStaffCustomQuestions}
                    className="w-full py-3 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>✓</span>
                    <span>Tidak Ada Pertanyaan Lagi → Lanjut Ke Konfirmasi Pendaftaran</span>
                  </button>
                </div>
              )}

              {session.workflow_state === 'COMPLETED' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4 text-center">
                  <p className="text-xs text-emerald-900 font-semibold">
                    Pendaftaran selesai. Klik tombol di bawah untuk mengembalikan tablet pasien ke layar menunggu pasien berikutnya:
                  </p>
                  <button
                    onClick={startNextPatient}
                    className="w-full py-3 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Selesai & Lanjut Pasien Berikutnya ↺
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#D9E1DD] text-xs text-[#63736E]">
                <span>Petugas: Gunakan tombol di atas atau navigasi alur.</span>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousState}
                    disabled={!currentConfig?.previousState}
                    className="px-3 py-1.5 bg-white border border-[#D9E1DD] rounded-md hover:bg-gray-50 disabled:opacity-40 cursor-pointer text-xs"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={goToNextState}
                    disabled={!currentConfig?.nextState}
                    className="px-3 py-1.5 bg-[#126B55] text-white rounded-md hover:bg-[#095442] disabled:opacity-40 cursor-pointer font-semibold text-xs"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            </div>

            {/* Push-to-Talk Voice Recognition / Speech-to-Text Card (Unlocked after DESTINATION) */}
            <div className={`bg-white rounded-xl border p-6 shadow-xs transition-opacity ${
              isVoiceSttUnlocked ? 'border-[#D9E1DD] opacity-100' : 'border-gray-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-lg text-[#13231F]">
                  Suara Petugas Loket (Voice Recognition STT)
                </h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  isVoiceSttUnlocked ? 'bg-emerald-50 text-[#126B55] border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {isVoiceSttUnlocked ? '🔓 Aktif' : '🔒 Terkunci'}
                </span>
              </div>

              {!isVoiceSttUnlocked ? (
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  🔒 Fitur Voice Recognition dikunci. Fitur ini akan aktif secara otomatis setelah pertanyaan <strong>Keperluan & Poli Tujuan</strong> dijawab oleh pasien.
                </p>
              ) : (
                <>
                  <p className="text-xs text-[#63736E] mb-4">
                    Bicara melalui mikrofon atau ketik pertanyaan tambahan. Tekan **&apos;Kirim Pertanyaan&apos;** untuk mengirimkan langsung ke tablet pasien.
                  </p>

                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={handleToggleMic}
                      disabled={!isVoiceSttUnlocked}
                      className={`flex-1 py-4 rounded-xl font-heading font-bold text-base transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer ${
                        isListening
                          ? 'bg-[#B42318] text-white animate-pulse'
                          : 'bg-[#13231F] hover:bg-black text-white disabled:opacity-50'
                      }`}
                    >
                      <span className="text-2xl">{isListening ? '🛑' : '🎙️'}</span>
                      <span>{isListening ? 'Mendengarkan... (Tekan untuk berhenti)' : 'Tahan / Tekan untuk Bicara (STT)'}</span>
                    </button>
                  </div>

                  {speechError && (
                    <p className="text-xs text-[#B42318] mb-3 bg-red-50 p-2 rounded border border-red-200">
                      {speechError}
                    </p>
                  )}

                  <form onSubmit={handleSendCustomQuestion} className="flex gap-2">
                    <input
                      type="text"
                      value={speechText}
                      onChange={(e) => setSpeechText(e.target.value)}
                      placeholder="Hasil ucapan STT / ketik pertanyaan tambahan di sini..."
                      disabled={!isVoiceSttUnlocked}
                      className="flex-1 px-4 py-2.5 border border-[#D9E1DD] rounded-lg text-xs bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none disabled:bg-gray-100"
                    />
                    <button
                      type="submit"
                      disabled={!speechText.trim() || !isVoiceSttUnlocked}
                      className="px-5 py-2.5 bg-[#126B55] hover:bg-[#095442] disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <span>🚀</span>
                      <span>Kirim Pertanyaan</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Current Answer & Full Answer History */}
          <div className="lg:col-span-5 space-y-6">
            {/* Current Answer Monitor */}
            <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-base text-[#13231F]">
                  Jawaban Pasien Saat Ini
                </h3>
                <span className="text-xs font-mono bg-emerald-50 text-[#126B55] px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Live
                </span>
              </div>

              {session.need_human_help && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 animate-pulse space-y-3">
                  <div>
                    <strong className="block text-sm mb-1">⚠️ Pasien Meminta Bantuan!</strong>
                    <p className="text-xs text-red-800">
                      Pasien di tablet menekan tombol bantuan petugas. Mohon asistensi langsung di loket.
                    </p>
                  </div>
                  <button
                    onClick={resumeFromHelp}
                    className="w-full py-2 bg-[#B42318] hover:bg-red-900 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    ✓ Selesaikan Bantuan & Lanjutkan Sesi Tablet
                  </button>
                </div>
              )}

              {session.user_intent || session.user_confirmed_text ? (
                <div className="bg-[#F8FAF9] border border-[#D9E1DD] rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between text-xs text-[#63736E] mb-1">
                    <span>Hasil Diterima:</span>
                    <span className="font-mono text-[#16734E] font-semibold">
                      Kepercayaan: {Math.round(session.confidence * 100)}%
                    </span>
                  </div>

                  <p className="font-heading font-bold text-xl text-[#126B55] mb-1">
                    {session.user_confirmed_text || session.user_intent}
                  </p>

                  {session.user_intent && INTENT_TRANSLATIONS[session.user_intent] && (
                    <p className="text-xs text-[#63736E]">
                      {INTENT_TRANSLATIONS[session.user_intent].descriptionText}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center bg-[#F8FAF9] rounded-xl border border-dashed border-[#D9E1DD] text-[#63736E]">
                  <p className="text-xs font-medium">Menunggu jawaban isyarat pasien...</p>
                </div>
              )}

              {(session.user_confirmed_text || session.user_intent) && (
                <button
                  onClick={() =>
                    speakText(
                      session.user_confirmed_text ||
                        (session.user_intent ? INTENT_TRANSLATIONS[session.user_intent]?.labelText : '')
                    )
                  }
                  className="w-full py-2.5 bg-[#16734E] hover:bg-emerald-800 text-white font-heading font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <span>🔊</span>
                  <span>Bacakan Jawaban (TTS Suara)</span>
                </button>
              )}
            </div>

            {/* History Jawaban Pasien Untuk Tiap Pertanyaan */}
            <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D9E1DD]">
                <div className="flex items-center gap-2">
                  <span className="text-[#126B55] text-base">📜</span>
                  <h3 className="font-heading font-bold text-base text-[#13231F]">
                    Riwayat Jawaban Pasien
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#63736E]">
                  {session.patient_answers?.length || 0} Jawaban
                </span>
              </div>

              {session.patient_answers && session.patient_answers.length > 0 ? (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {session.patient_answers.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 bg-[#F8FAF9] border border-[#D9E1DD] rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[#63736E] text-[11px]">
                        <span className="font-semibold text-[#126B55]">Pertanyaan 0{index + 1}:</span>
                        <span className="font-mono text-[10px]">{item.timestamp}</span>
                      </div>
                      <p className="font-semibold text-[#13231F]">{item.question}</p>
                      <div className="pt-1.5 flex items-center justify-between border-t border-[#D9E1DD]/60">
                        <span className="text-[#63736E]">Jawaban / Catatan:</span>
                        <strong className="font-bold text-[#126B55] bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {item.answer}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F8FAF9] rounded-lg border border-dashed border-[#D9E1DD] text-[#63736E]">
                  <p className="text-xs font-medium">Belum ada riwayat jawaban.</p>
                  <p className="text-[11px] opacity-75 mt-1">
                    Setiap jawaban dan konfirmasi dokumen fisik akan tercatat secara otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StaffTerminalPage() {
  return (
    <SessionProvider>
      <StaffTerminalContent />
    </SessionProvider>
  );
}
