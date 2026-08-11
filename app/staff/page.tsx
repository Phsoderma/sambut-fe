'use client';

import React, { useState } from 'react';
import { useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from '../lib/workflow';
import { parseSpeechText } from '../lib/apiClient';

function StaffTerminalContent() {
  const {
    session,
    goToNextState,
    goToPreviousState,
    setWorkflowState,
    setCurrentQuestion,
    setStaffSpeech,
    resumeFromHelp,
    completeSession,
    resetSession,
    startNextPatient,
    approveKtpVerification,
    rejectKtpVerification,
  } = useSession();

  const [speechText, setSpeechText] = useState('');
  const [customQuestionInput, setCustomQuestionInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const currentConfig = WORKFLOW_STATES[session.workflow_state];

  // Preset Default Questions from System Workflow
  const defaultQuestions = [
    { label: 'Status Pasien', text: 'Apakah Anda pernah berobat di Puskesmas ini sebelumnya?' },
    { label: 'Identitas Diri', text: 'Silakan tunjukkan KTP, KK, atau identitas diri kepada petugas.' },
    { label: 'Peserta BPJS', text: 'Apakah Anda menggunakan kartu JKN / BPJS Kesehatan?' },
    { label: 'Keluhan / Poli', text: 'Apa keperluan Anda atau keluhan yang dirasakan hari ini?' },
    { label: 'Konfirmasi Data', text: 'Apakah data pendaftaran Anda di atas sudah benar?' },
  ];

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
      const windowAny = window as any;
      const SpeechRecognitionClass = windowAny.webkitSpeechRecognition || windowAny.SpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        setIsListening(false);

        // Parse speech intent with backend API
        const parseRes = await parseSpeechText(session.session_id, transcript);
        setStaffSpeech(transcript, parseRes.intent);
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

  const handleManualSpeechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechText.trim()) return;
    const parseRes = await parseSpeechText(session.session_id, speechText);
    setStaffSpeech(speechText, parseRes.intent);
    setSpeechText('');
  };

  const handleSendCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionInput.trim()) return;
    setCurrentQuestion(customQuestionInput.trim());
    setCustomQuestionInput('');
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
          {/* Human Help Escalation Alert Card for Staff */}
          {session.need_human_help && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-5 shadow-sm animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-heading font-bold text-red-900 text-base flex items-center gap-2">
                  ⚠️ Panggilan Bantuan Pasien!
                </span>
                <p className="text-xs text-red-700 mt-1">
                  Pasien memerlukan bantuan petugas loket. Setelah memberikan panduan, tekan tombol di kanan untuk melanjutkan.
                </p>
              </div>
              <button
                onClick={resumeFromHelp}
                className="px-4 py-2.5 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-heading font-semibold rounded-lg shadow-sm whitespace-nowrap cursor-pointer transition-all"
              >
                Petugas Hadir — Lanjutkan Sesi →
              </button>
            </div>
          )}

          {/* Workflow Stepper Control */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55]">
                Alur Pendaftaran Puskesmas
              </span>
              <button
                onClick={startNextPatient}
                className="px-3.5 py-1.5 bg-[#126B55]/10 hover:bg-[#126B55] text-[#126B55] hover:text-white border border-[#126B55]/30 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>🔄</span>
                <span>Reset Sesi ke Sambut Siap Digunakan</span>
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
                Pertanyaan Yang Tampil Pada Tablet Pasien (Live):
              </span>
              <p className="font-heading font-bold text-xl text-[#13231F] mb-3">
                {session.current_question.text || currentConfig?.questionText}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-[#D9E1DD] text-xs text-[#63736E]">
                <span>Petugas dapat terus menambah pertanyaan selama sesi berlangsung.</span>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousState}
                    disabled={!currentConfig?.previousState}
                    className="px-3 py-1.5 bg-white border border-[#D9E1DD] rounded-md hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Langkah Lalu
                  </button>
                  <button
                    onClick={goToNextState}
                    disabled={!currentConfig?.nextState}
                    className="px-3 py-1.5 bg-[#126B55] text-white rounded-md hover:bg-[#095442] disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    Langkah Lanjut →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preset Default Questions & Custom Question Input */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-heading font-bold text-base text-[#13231F] mb-1">
                Pertanyaan Bawaan Sistem (Pilih & Kirim Live)
              </h3>
              <p className="text-xs text-[#63736E] mb-3">
                Klik pertanyaan bawaan di bawah untuk langsung memperbarui layar tablet pasien.
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(q.text)}
                    className="px-3 py-2 bg-[#F8FAF9] hover:bg-emerald-50 hover:border-[#126B55] text-[#13231F] text-xs rounded-lg border border-[#D9E1DD] font-medium transition-all text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="text-[#126B55] font-bold">💬</span>
                    <span><strong>{q.label}:</strong> {q.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-[#D9E1DD]" />

            {/* Custom Question Text Input */}
            <form onSubmit={handleSendCustomQuestion}>
              <label className="block text-xs font-bold text-[#13231F] mb-1">
                Tambah Pertanyaan Kustom Baru ke Pasien
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuestionInput}
                  onChange={(e) => setCustomQuestionInput(e.target.value)}
                  placeholder="Ketik pertanyaan tambahan (misal: 'Apakah alergi obat tertentu?')..."
                  className="flex-1 px-4 py-2 border border-[#D9E1DD] rounded-lg text-xs bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Update Ke Pasien
                </button>
              </div>
            </form>
          </div>

          {/* Push-to-Talk Mic Input Card */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs">
            <h3 className="font-heading font-bold text-base text-[#13231F] mb-1">
              Suara Petugas Loket (Push-to-Talk STT)
            </h3>
            <p className="text-xs text-[#63736E] mb-3">
              Bicara langsung via mikrofon. Ucapan akan otomatis dikirim sebagai pertanyaan live ke tablet pasien.
            </p>

            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleToggleMic}
                className={`flex-1 py-3.5 rounded-xl font-heading font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer ${
                  isListening
                    ? 'bg-[#B42318] text-white animate-pulse'
                    : 'bg-[#13231F] hover:bg-black text-white'
                }`}
              >
                <span className="text-xl">{isListening ? '🛑' : '🎙️'}</span>
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
                placeholder="Atau ketik ucapan petugas (misal: 'Silakan ambil berkas obat')..."
                className="flex-1 px-4 py-2 border border-[#D9E1DD] rounded-lg text-xs bg-[#F8FAF9] focus:ring-2 focus:ring-[#126B55] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#126B55] text-white text-xs font-semibold rounded-lg hover:bg-[#095442] cursor-pointer"
              >
                Kirim Ucapan
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Patient Response Monitor & Queue Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Answer Monitor Box */}
          <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg text-[#13231F]">
                  Jawaban Pasien (Received Intent)
                </h3>
                <span className="text-xs font-mono bg-[#F8FAF9] px-2 py-1 rounded border border-[#D9E1DD]">
                  Live Receiver
                </span>
              </div>

              {/* KTP Verification Card Banner (Shows when in IDENTITY step or PENDING verification) */}
              {(session.workflow_state === 'IDENTITY' || session.ktp_verification_status === 'PENDING') && session.ktp_verification_status !== 'APPROVED' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <span className="text-lg">🪪</span>
                      <span>Pemeriksaan KTP / KK Pasien:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] uppercase tracking-wider font-mono font-bold">
                      {session.ktp_verification_status === 'PENDING' ? 'Foto Terkirim - Perlu ACC' : 'Menunggu Kamera Pasien'}
                    </span>
                  </div>

                  {/* Thumbnail preview */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-amber-300 bg-gray-900 shadow-sm">
                    <img
                      src={session.ktp_image_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" rx="12" fill="%230284c7"/><rect x="15" y="15" width="450" height="270" rx="8" fill="none" stroke="%2338bdf8" stroke-width="2"/><text x="240" y="45" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23ffffff" text-anchor="middle">PROVINSI DKI JAKARTA</text><text x="240" y="65" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23ffffff" text-anchor="middle">KOTA JAKARTA SELATAN</text><text x="35" y="105" font-family="monospace" font-weight="bold" font-size="16" fill="%23ffffff">NIK : 3174052108950003</text><text x="35" y="140" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Nama : AHMAD HIDAYAT</text><text x="35" y="165" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Tempat/Tgl Lahir : JAKARTA, 21-08-1995</text><text x="35" y="190" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Jenis Kelamin : LAKI-LAKI</text><text x="35" y="215" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Alamat : JL. SUDIRMAN NO. 45</text><text x="35" y="240" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Agama : ISLAM</text><rect x="340" y="95" width="110" height="150" rx="6" fill="%23e2e8f0" stroke="%2394a3b8" stroke-width="2"/><text x="395" y="180" font-family="sans-serif" font-size="45" text-anchor="middle" fill="%23475569">👤</text></svg>'}
                      alt="Pemindaian Dokumen KTP Pasien"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white px-2 py-1 rounded text-[10px] font-mono flex justify-between">
                      <span>Dokumen Identitas KTP</span>
                      <span className="text-emerald-400 font-bold">Live Camera Scan</span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-800 leading-relaxed">
                    Periksa foto fisik KTP pasien di atas. Tekan <strong>Setujui / ACC KTP</strong> untuk melanjutkan pasien atau <strong>Tolak</strong> untuk minta ulang.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={rejectKtpVerification}
                      className="py-2.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>❌</span>
                      <span>Tolak KTP</span>
                    </button>
                    <button
                      onClick={approveKtpVerification}
                      className="py-2.5 bg-[#126B55] hover:bg-[#095442] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>✅</span>
                      <span>Setujui / ACC KTP</span>
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const latestAnswerText =
                  session.user_confirmed_text ||
                  (session.user_intent ? (INTENT_TRANSLATIONS[session.user_intent]?.labelText || session.user_intent) : null) ||
                  (session.patient_answers && session.patient_answers.length > 0
                    ? session.patient_answers[session.patient_answers.length - 1].answer
                    : null);

                if (!latestAnswerText && (!session.patient_answers || session.patient_answers.length === 0)) {
                  return (
                    <div className="p-8 text-center bg-[#F8FAF9] rounded-xl border border-dashed border-[#D9E1DD] text-[#63736E] my-4">
                      <div className="text-3xl mb-2">⏳</div>
                      <p className="text-sm font-medium">Menunggu jawaban isyarat dari pasien...</p>
                      <p className="text-xs opacity-75 mt-1">
                        Hasil gestur atau ketikan yang diperagakan di tablet akan muncul di sini secara real-time.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 mb-4">
                    {latestAnswerText && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-[#63736E] mb-1">
                          <span className="font-bold text-[#126B55]">Jawaban Terbaru Pasien:</span>
                          <span className="font-mono text-[#16734E] font-semibold">
                            Kepercayaan: {session.confidence ? Math.round(session.confidence * 100) : 100}%
                          </span>
                        </div>

                        <p className="font-heading font-bold text-2xl text-[#126B55] mb-1">
                          {latestAnswerText}
                        </p>

                        {session.user_intent && INTENT_TRANSLATIONS[session.user_intent] && (
                          <p className="text-xs text-[#63736E]">
                            {INTENT_TRANSLATIONS[session.user_intent].descriptionText}
                          </p>
                        )}
                      </div>
                    )}

                  {session.patient_answers && session.patient_answers.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#13231F] mb-2 uppercase tracking-wider">
                        <span>📋 Rekap Jawaban Pasien ({session.patient_answers.length}):</span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {session.patient_answers.map((item, idx) => (
                          <div key={idx} className="p-3 bg-[#F8FAF9] rounded-lg border border-[#D9E1DD] text-xs flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[#63736E] font-medium block text-[11px] mb-0.5">{item.question}</span>
                              <strong className="text-[#126B55] text-sm font-bold block">➔ {item.answer}</strong>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">{item.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                );
              })()}

              {/* TTS Readout Button */}
              {(session.user_confirmed_text || session.user_intent || (session.patient_answers && session.patient_answers.length > 0)) && (
                <button
                  onClick={() => {
                    const latest = session.patient_answers && session.patient_answers.length > 0
                      ? session.patient_answers[session.patient_answers.length - 1].answer
                      : (session.user_confirmed_text || (session.user_intent ? INTENT_TRANSLATIONS[session.user_intent]?.labelText : ''));
                    speakText(latest);
                  }}
                  className="w-full py-2.5 mb-4 bg-[#16734E] hover:bg-emerald-800 text-white font-heading font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔊</span>
                  <span>Bacakan Jawaban Pasien (TTS Suara)</span>
                </button>
              )}
            </div>

            {/* Final Queue Confirmation & Reset Session Buttons */}
            <div className="pt-4 border-t border-[#D9E1DD] space-y-2">
              <button
                onClick={completeSession}
                className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Konfirmasi Pasien & Selesaikan Antrean</span>
              </button>
              <button
                onClick={resetSession}
                className="w-full py-2.5 bg-red-50 hover:bg-[#B42318] text-[#B42318] hover:text-white border border-red-200 font-heading font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Reset / Batalkan Sesi Ini</span>
              </button>
              <p className="text-[11px] text-[#63736E] text-center mt-1">
                Membatalkan sesi dan mengembalikan tablet ke layar penginputan kode sesi baru.
              </p>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default function StaffTerminalPage() {
  return <StaffTerminalContent />;
}
