'use client';

import React, { useState } from 'react';
import { SessionProvider, useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from '../lib/workflow';
import { parseSpeechText } from '../lib/apiClient';

function StaffTerminalContent() {
  const {
    session,
    goToNextState,
    goToPreviousState,
    setWorkflowState,
    setStaffSpeech,
    resetSession,
  } = useSession();

  const [speechText, setSpeechText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const currentConfig = WORKFLOW_STATES[session.workflow_state];

  // Speech Recognition integration (Web Speech API)
  const handleToggleMic = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechError('Web Speech API tidak didukung di browser ini. Gunakan input manual di bawah.');
      return;
    }

    try {
      const SpeechRecognition = (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition; SpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition || (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition; SpeechRecognition: new () => SpeechRecognition }).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        setIsListening(false);

        // Parse speech intent with backend API
        const parseRes = await parseSpeechText(session.session_id, transcript);
        setStaffSpeech(transcript, parseRes.intent);
      };

      recognition.onerror = (err: SpeechRecognitionErrorEvent) => {
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

  const handleManualSpeechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechText.trim()) return;
    const parseRes = await parseSpeechText(session.session_id, speechText);
    setStaffSpeech(speechText, parseRes.intent);
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="staff" />

      {/* Main Staff Desktop Layout - 1440x900 Contract */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Push-to-Talk, Current State & Question Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Workflow Stepper Control */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55]">
                Alur Pendaftaran Puskesmas
              </span>
              <button
                onClick={resetSession}
                className="text-xs text-[#63736E] hover:text-[#B42318] underline font-medium cursor-pointer"
              >
                Reset Sesi
              </button>
            </div>

            {/* Step Badges */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {(Object.keys(WORKFLOW_STATES) as Array<keyof typeof WORKFLOW_STATES>)
                .filter((s) => s !== 'START')
                .map((stepKey, idx) => {
                  const isActive = session.workflow_state === stepKey;
                  return (
                    <button
                      key={stepKey}
                      onClick={() => setWorkflowState(stepKey)}
                      className={`p-2 rounded-lg text-center border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#126B55] text-white border-[#126B55] font-bold shadow-xs'
                          : 'bg-[#F8FAF9] text-[#63736E] border-[#D9E1DD] hover:border-[#126B55] text-xs font-medium'
                      }`}
                    >
                      <span className="block text-[10px] opacity-80">0{idx + 1}</span>
                      <span className="truncate block text-xs">{WORKFLOW_STATES[stepKey].title}</span>
                    </button>
                  );
                })}
            </div>

            {/* Current Active Question Display */}
            <div className="bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] p-5">
              <span className="text-xs font-semibold text-[#63736E] uppercase block mb-1">
                Pertanyaan Yang Tampil Pada Tablet Pasien:
              </span>
              <p className="font-heading font-bold text-xl text-[#13231F] mb-3">
                {currentConfig?.questionText}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#D9E1DD] text-xs text-[#63736E]">
                <span>Petugas: Bicara atau pilih tombol untuk memperbarui pertanyaan.</span>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousState}
                    disabled={!currentConfig?.previousState}
                    className="px-3 py-1.5 bg-white border border-[#D9E1DD] rounded-md hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={goToNextState}
                    disabled={!currentConfig?.nextState}
                    className="px-3 py-1.5 bg-[#126B55] text-white rounded-md hover:bg-[#095442] disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Push-to-Talk Mic Input Card */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
            <h3 className="font-heading font-bold text-lg text-[#13231F] mb-2">
              Suara Petugas Loket (Push-to-Talk STT)
            </h3>
            <p className="text-xs text-[#63736E] mb-4">
              Tekan tombol mikrofon untuk berbicara secara alami. Ucapan akan otomatis dipetakan ke pertanyaan canonical.
            </p>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleToggleMic}
                className={`flex-1 py-4 rounded-xl font-heading font-bold text-base transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer ${
                  isListening
                    ? 'bg-[#B42318] text-white animate-pulse'
                    : 'bg-[#13231F] hover:bg-black text-white'
                }`}
              >
                <span className="text-2xl">{isListening ? '🛑' : '🎙️'}</span>
                <span>{isListening ? 'Mendengarkan... (Tekan untuk berhenti)' : 'Tahan / Tekan untuk Bicara'}</span>
              </button>
            </div>

            {speechError && (
              <p className="text-xs text-[#B42318] mb-3 bg-red-50 p-2 rounded border border-red-200">
                {speechError}
              </p>
            )}

            {/* Manual Speech Text Fallback */}
            <form onSubmit={handleManualSpeechSubmit} className="flex gap-2">
              <input
                type="text"
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="Atau ketik ucapan petugas di sini (misal: 'Apakah pasien baru?')..."
                className="flex-1 px-4 py-2 border border-[#D9E1DD] rounded-lg text-xs bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#126B55] text-white text-xs font-semibold rounded-lg hover:bg-[#095442] cursor-pointer"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Patient Response Monitor & TTS Reader */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Answer Monitor Box */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg text-[#13231F]">
                  Jawaban Pasien (Received Intent)
                </h3>
                <span className="text-xs font-mono bg-[#F8FAF9] px-2 py-1 rounded border border-[#D9E1DD]">
                  Live Receiver
                </span>
              </div>

              {session.need_human_help && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 animate-pulse">
                  <strong className="block text-sm mb-1">⚠️ Pasien Meminta Bantuan!</strong>
                  <p className="text-xs text-red-800">
                    Pasien di tablet menekan tombol bantuan petugas. Mohon asistensi langsung di loket.
                  </p>
                </div>
              )}

              {session.user_intent || session.user_confirmed_text ? (
                <div className="bg-[#F8FAF9] border border-[#D9E1DD] rounded-xl p-5 mb-4">
                  <div className="flex items-center justify-between text-xs text-[#63736E] mb-2">
                    <span>Intent Terkonfirmasi:</span>
                    <span className="font-mono text-[#16734E] font-semibold">
                      Kepercayaan: {Math.round(session.confidence * 100)}%
                    </span>
                  </div>

                  <p className="font-heading font-bold text-2xl text-[#126B55] mb-2">
                    {session.user_confirmed_text || session.user_intent}
                  </p>

                  {session.user_intent && INTENT_TRANSLATIONS[session.user_intent] && (
                    <p className="text-xs text-[#63736E]">
                      {INTENT_TRANSLATIONS[session.user_intent].descriptionText}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F8FAF9] rounded-xl border border-dashed border-[#D9E1DD] text-[#63736E] my-6">
                  <div className="text-3xl mb-2">⏳</div>
                  <p className="text-sm font-medium">Menunggu jawaban isyarat dari pasien...</p>
                  <p className="text-xs opacity-75 mt-1">
                    Hasil gestur yang diperagakan di tablet akan muncul di sini secara real-time.
                  </p>
                </div>
              )}
            </div>

            {/* TTS Readout Button */}
            {(session.user_confirmed_text || session.user_intent) && (
              <button
                onClick={() =>
                  speakText(
                    session.user_confirmed_text ||
                      (session.user_intent ? INTENT_TRANSLATIONS[session.user_intent]?.labelText : '')
                  )
                }
                className="w-full py-3 bg-[#16734E] hover:bg-emerald-800 text-white font-heading font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔊</span>
                <span>Bacakan Jawaban dengan TTS (Suara)</span>
              </button>
            )}
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
