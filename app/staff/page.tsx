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
    setStaffViewState,
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

  // Active state viewed by staff (defaults to patient's active state if not set)
  const activeStaffState: WorkflowState = session.staff_view_state || session.workflow_state;
  const currentConfig = WORKFLOW_STATES[activeStaffState];

  // Voice STT card is visible ONLY in the step AFTER DESTINATION is answered (WAITING_STAFF_QUESTION or CUSTOM_QUESTION)
  const isVoiceSttVisible =
    session.workflow_state === 'WAITING_STAFF_QUESTION' ||
    session.workflow_state === 'CUSTOM_QUESTION';

  // Speech Recognition integration (Web Speech API) - Fills text input ONLY
  const handleToggleMic = () => {
    if (!isVoiceSttVisible) return;

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

  // Staff explicitly clicks "Kirim Pertanyaan" button to form & send custom question to patient tablet
  const handleSendCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechText.trim() || !isVoiceSttVisible) return;
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
  const customStepKeys: { key: string; label: string; state: WorkflowState }[] = customQuestions.map((item, idx) => ({
    key: `custom_${idx}`,
    label: `Pertanyaan Tambahan ${idx + 1}`,
    state: 'CUSTOM_QUESTION',
  }));

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

  // Completed steps indices for checkmarks
  const activePatientIndex = allStepperItems.findIndex((i) => i.state === session.workflow_state);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="staff" />

      {/* Main Staff Desktop Layout - 1440x900 Contract */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Horizontal Stepper Alur Pendaftaran Ke Samping */}
        <div className="bg-white rounded-xl border border-[#D9E1DD] p-5 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-base text-[#13231F]">
              Alur Pendaftaran Puskesmas (Horizontal Stepper)
            </h2>
            <button
              onClick={resetSession}
              className="text-xs text-[#63736E] hover:text-[#B42318] underline font-medium cursor-pointer"
            >
              Reset / Pasien Berikutnya
            </button>
          </div>

          {/* Horizontal Stepper Track - Staff can browse without shifting patient */}
          <div className="flex items-center gap-2 min-w-[850px]">
            {allStepperItems.map((stepItem, idx) => {
              const isInspected = activeStaffState === stepItem.state;
              const isCompleted = activePatientIndex > idx;

              return (
                <React.Fragment key={stepItem.key}>
                  <button
                    onClick={() => setStaffViewState(stepItem.state)}
                    className={`flex-1 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isInspected
                        ? 'bg-[#126B55] text-white border-[#126B55] shadow-xs'
                        : isCompleted
                        ? 'bg-[#F8FAF9] text-[#126B55] border-emerald-200 font-semibold'
                        : 'bg-[#F8FAF9] text-[#63736E] border-[#D9E1DD] hover:border-[#126B55]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold opacity-80">STEP 0{idx + 1}</span>
                      {isCompleted && <span className="text-xs font-bold text-[#126B55]">✓</span>}
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
            
            {/* STANDALONE ACTION BOX (ABOVE QUESTION BOX) - Clean Centered Layout Without Subtext or Emojis */}
            {session.workflow_state === 'START' && (
              <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-xs bg-emerald-50/60 text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#126B55] block text-center">
                  AKSI PETUGAS LOKET: PERSIAPAN SESI
                </span>
                <button
                  onClick={startRegistrationByStaff}
                  className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center text-center"
                >
                  Mulai Sesi Pendaftaran Pasien
                </button>
              </div>
            )}

            {(session.workflow_state === 'WAITING_STAFF_QUESTION' || session.workflow_state === 'CUSTOM_QUESTION') && (
              <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-xs bg-emerald-50/60 text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#126B55] block text-center">
                  KONFIRMASI SESI PERTANYAAN PETUGAS
                </span>
                <button
                  onClick={finishStaffCustomQuestions}
                  className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center justify-center text-center"
                >
                  Tidak Ada Pertanyaan Lagi, Lanjut Ke Konfirmasi Pendaftaran
                </button>
              </div>
            )}

            {session.workflow_state === 'COMPLETED' && (
              <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-xs bg-emerald-50/60 text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#126B55] block text-center">
                  AKSI SELESAI PENDAFTARAN
                </span>
                <button
                  onClick={startNextPatient}
                  className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center text-center"
                >
                  Selesai dan Lanjut Pasien Berikutnya
                </button>
              </div>
            )}

            {/* Active Question Box */}
            <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#126B55] uppercase tracking-wider">
                  Pertanyaan Dilihat Petugas ({WORKFLOW_STATES[activeStaffState]?.title})
                </span>
                <span className="text-xs font-mono bg-[#F8FAF9] px-2 py-0.5 rounded border border-[#D9E1DD] text-[#63736E]">
                  Tablet Pasien: {session.workflow_state}
                </span>
              </div>

              <p className="font-heading font-bold text-2xl text-[#13231F] mb-4">
                {activeStaffState === 'CUSTOM_QUESTION' && session.current_question?.text
                  ? session.current_question.text
                  : currentConfig?.questionText}
              </p>

              {/* ATTACHED CONTROLS INSIDE QUESTION BOX FOR KTP & BPJS ONLY */}
              {activeStaffState === 'IDENTITY' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4">
                  <span className="text-xs font-bold text-emerald-900 block">
                    Konfirmasi Pemeriksaan KTP / KK Fisik Pasien:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmKtpDoc('RECEIVED')}
                      className="py-3 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      Dokumen KTP/KK Diterima
                    </button>
                    <button
                      onClick={() => confirmKtpDoc('NOT_AVAILABLE')}
                      className="py-3 bg-white text-[#13231F] border border-[#D9E1DD] hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Dokumen Tidak Tersedia
                    </button>
                  </div>
                </div>
              )}

              {activeStaffState === 'INSURANCE' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 mb-4">
                  <span className="text-xs font-bold text-emerald-900 block">
                    Konfirmasi Pemeriksaan Kartu BPJS / JKN Fisik Pasien:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmBpjsDoc('RECEIVED')}
                      className="py-3 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      Kartu BPJS Diterima
                    </button>
                    <button
                      onClick={() => confirmBpjsDoc('NOT_USED')}
                      className="py-3 bg-white text-[#13231F] border border-[#D9E1DD] hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Pasien Umum (Tanpa BPJS)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#D9E1DD] text-xs text-[#63736E]">
                <span>Petugas dapat meninjau alur tanpa menggeser layar tablet pasien.</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStaffViewState(currentConfig?.previousState || 'START')}
                    disabled={!currentConfig?.previousState}
                    className="px-3 py-1.5 bg-white border border-[#D9E1DD] rounded-md hover:bg-gray-50 disabled:opacity-40 cursor-pointer text-xs"
                  >
                    Lihat Sebelumnya
                  </button>
                  <button
                    onClick={() => setStaffViewState(currentConfig?.nextState || 'COMPLETED')}
                    disabled={!currentConfig?.nextState}
                    className="px-3 py-1.5 bg-[#126B55] text-white rounded-md hover:bg-[#095442] disabled:opacity-40 cursor-pointer font-semibold text-xs"
                  >
                    Lihat Selanjutnya
                  </button>
                </div>
              </div>
            </div>

            {/* Push-to-Talk Voice Recognition / Speech-to-Text Card (Appears ONLY in step AFTER DESTINATION) */}
            {isVoiceSttVisible && (
              <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-bold text-lg text-[#13231F]">
                    Suara Petugas Loket (Voice Recognition STT)
                  </h3>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-[#126B55] px-2 py-0.5 rounded border border-emerald-200">
                    Pertanyaan Tambahan Aktif
                  </span>
                </div>

                <p className="text-xs text-[#63736E] mb-4">
                  Bicara melalui mikrofon atau ketik pertanyaan tambahan. Tekan Kirim Pertanyaan untuk mengirimkan langsung ke tablet pasien.
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={handleToggleMic}
                    className={`flex-1 py-4 rounded-xl font-heading font-bold text-base transition-all flex items-center justify-center shadow-sm cursor-pointer ${
                      isListening
                        ? 'bg-[#B42318] text-white animate-pulse'
                        : 'bg-[#13231F] hover:bg-black text-white'
                    }`}
                  >
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
                    className="flex-1 px-4 py-2.5 border border-[#D9E1DD] rounded-lg text-xs bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!speechText.trim()}
                    className="px-5 py-2.5 bg-[#126B55] hover:bg-[#095442] disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs flex items-center justify-center"
                  >
                    Kirim Pertanyaan
                  </button>
                </form>
              </div>
            )}
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
                    <strong className="block text-sm mb-1">Pasien Meminta Bantuan!</strong>
                    <p className="text-xs text-red-800">
                      Pasien di tablet menekan tombol bantuan petugas. Mohon asistensi langsung di loket.
                    </p>
                  </div>
                  <button
                    onClick={resumeFromHelp}
                    className="w-full py-2 bg-[#B42318] hover:bg-red-900 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Selesaikan Bantuan dan Lanjutkan Sesi Tablet
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
                  Bacakan Jawaban (TTS Suara)
                </button>
              )}
            </div>

            {/* History Jawaban Pasien Untuk Tiap Pertanyaan */}
            <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D9E1DD]">
                <h3 className="font-heading font-bold text-base text-[#13231F]">
                  Riwayat Jawaban Pasien
                </h3>
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
