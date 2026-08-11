'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { SessionState, UserIntent, StaffIntent, WorkflowState } from './types';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from './workflow';

interface SessionContextType {
  session: SessionState;
  pairingCodeInput: string;
  setPairingCodeInput: (code: string) => void;
  startSession: (code?: string) => void;
  pairDevice: (code: string) => boolean;
  goToNextState: () => void;
  goToPreviousState: () => void;
  setWorkflowState: (state: WorkflowState) => void;
  setCurrentQuestion: (questionText: string) => void;
  setUserIntent: (intent: UserIntent, confidence?: number) => void;
  setStaffSpeech: (text: string, intent?: StaffIntent) => void;
  confirmAnswer: (confirmedText: string) => void;
  requestHumanHelp: () => void;
  resumeFromHelp: () => void;
  completeSession: () => void;
  resetSession: () => void;
  startNextPatient: () => void;
  submitKtpForVerification: (imageUrl?: string) => void;
  approveKtpVerification: () => void;
  rejectKtpVerification: () => void;
  retryKtpVerification: () => void;
}

const DEFAULT_SESSION: SessionState = {
  session_id: 'SMB-8821',
  role_status: 'WAITING',
  workflow_state: 'START',
  current_question: {
    text: WORKFLOW_STATES.START.questionText,
    sign_description: WORKFLOW_STATES.START.signDescription,
  },
  question_history: [WORKFLOW_STATES.START.questionText],
  staff_transcript: null,
  staff_intent: null,
  user_intent: null,
  user_confirmed_text: null,
  confidence: 0,
  confidence_band: 'UNKNOWN',
  retry_count: 0,
  need_human_help: false,
  started_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const BROADCAST_CHANNEL_NAME = 'sambut_session_sync';

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionState>(DEFAULT_SESSION);
  const [pairingCodeInput, setPairingCodeInput] = useState<string>('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Load stored session on client mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sambut_session');
      if (saved) {
        try {
          setSession(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse stored session:', e);
        }
      }
    }
  }, []);

  // Sync state across browser tabs using BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'SESSION_UPDATE') {
        setSession(event.data.payload);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const broadcastUpdate = useCallback((updatedState: SessionState) => {
    setSession(updatedState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sambut_session', JSON.stringify(updatedState));
        if (channelRef.current) {
          channelRef.current.postMessage({ type: 'SESSION_UPDATE', payload: updatedState });
        }
      } catch (e) {
        console.error('Session sync error:', e);
      }
    }
  }, []);

  const startSession = useCallback((customCode?: string) => {
    const code = customCode || `SMB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newState: SessionState = {
      ...DEFAULT_SESSION,
      session_id: code,
      role_status: 'WAITING',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [broadcastUpdate]);

  const pairDevice = useCallback((code: string): boolean => {
    if (!code || code.trim().toUpperCase() !== session.session_id.toUpperCase()) {
      return false;
    }
    const newState: SessionState = {
      ...session,
      role_status: 'PAIRED',
      workflow_state: 'START',
      current_question: {
        text: WORKFLOW_STATES.START.questionText,
        sign_description: WORKFLOW_STATES.START.signDescription,
      },
      question_history: [WORKFLOW_STATES.START.questionText],
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
    return true;
  }, [session, broadcastUpdate]);

  const setWorkflowState = useCallback((state: WorkflowState) => {
    const config = WORKFLOW_STATES[state];
    const newHistory = [...(session.question_history || [])];
    if (config.questionText && !newHistory.includes(config.questionText)) {
      newHistory.push(config.questionText);
    }

    const newState: SessionState = {
      ...session,
      workflow_state: state,
      current_question: {
        text: config.questionText,
        bisindo_video_url: config.bisindoVideoUrl,
        sign_description: config.signDescription,
      },
      question_history: newHistory,
      user_intent: null,
      user_confirmed_text: session.user_confirmed_text,
      confidence: session.confidence || 0,
      confidence_band: session.confidence_band || 'UNKNOWN',
      need_human_help: false,
      has_pending_custom_question: false,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const setCurrentQuestion = useCallback((questionText: string) => {
    const newHistory = [...(session.question_history || [])];
    if (questionText && newHistory[newHistory.length - 1] !== questionText) {
      newHistory.push(questionText);
    }

    const newState: SessionState = {
      ...session,
      current_question: {
        text: questionText,
      },
      question_history: newHistory,
      has_pending_custom_question: true,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const goToNextState = useCallback(() => {
    if (session.has_pending_custom_question) {
      const newState: SessionState = {
        ...session,
        user_intent: null,
        user_confirmed_text: null,
        confidence: 0,
        confidence_band: 'UNKNOWN',
        need_human_help: false,
        has_pending_custom_question: false,
        updated_at: new Date().toISOString(),
      };
      broadcastUpdate(newState);
      return;
    }

    const currentConfig = WORKFLOW_STATES[session.workflow_state];
    if (currentConfig && currentConfig.nextState) {
      setWorkflowState(currentConfig.nextState);
    }
  }, [session, broadcastUpdate, setWorkflowState]);

  const goToPreviousState = useCallback(() => {
    const currentConfig = WORKFLOW_STATES[session.workflow_state];
    if (currentConfig && currentConfig.previousState) {
      setWorkflowState(currentConfig.previousState);
    }
  }, [session, setWorkflowState]);

  const setUserIntent = useCallback((intent: UserIntent, confidence: number = 0.85) => {
    let band: SessionState['confidence_band'] = 'HIGH';
    if (confidence < 0.6) band = 'LOW';
    else if (confidence < 0.75) band = 'MEDIUM';
    if (intent === 'UNKNOWN') band = 'UNKNOWN';

    const translation = INTENT_TRANSLATIONS[intent];
    const newState: SessionState = {
      ...session,
      user_intent: intent,
      confidence: confidence,
      confidence_band: band,
      user_confirmed_text: translation ? translation.labelText : intent,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const setStaffSpeech = useCallback((text: string, intent?: StaffIntent) => {
    const newHistory = [...(session.question_history || [])];
    if (text && newHistory[newHistory.length - 1] !== text) {
      newHistory.push(text);
    }

    const newState: SessionState = {
      ...session,
      staff_transcript: text,
      staff_intent: intent || 'TANYA_KELUHAN',
      current_question: {
        text: text,
      },
      question_history: newHistory,
      has_pending_custom_question: true,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const confirmAnswer = useCallback((confirmedText: string) => {
    const existingAnswers = session.patient_answers || [];
    const questionText = session.current_question.text || 'Pertanyaan';
    
    const updatedAnswers = [
      ...existingAnswers.filter((a) => a.question !== questionText),
      {
        question: questionText,
        answer: confirmedText,
        confidence: session.confidence || 0.88,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    const newState: SessionState = {
      ...session,
      user_confirmed_text: confirmedText,
      patient_answers: updatedAnswers,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const requestHumanHelp = useCallback(() => {
    const newState: SessionState = {
      ...session,
      need_human_help: true,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const resumeFromHelp = useCallback(() => {
    const newState: SessionState = {
      ...session,
      need_human_help: false,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const completeSession = useCallback(() => {
    setWorkflowState('COMPLETED');
  }, [setWorkflowState]);

  const resetSession = useCallback(() => {
    // Reset session completely so staff must re-enter 4-digit session code on tablet
    startSession();
  }, [startSession]);

  const startNextPatient = useCallback(() => {
    // Reset session for the next patient while keeping device PAIRED
    // so tablet automatically lands on "SAMBUT Siap Digunakan"
    const newState: SessionState = {
      ...session,
      role_status: 'PAIRED',
      workflow_state: 'START',
      current_question: {
        text: WORKFLOW_STATES.START.questionText,
        sign_description: WORKFLOW_STATES.START.signDescription,
      },
      question_history: [WORKFLOW_STATES.START.questionText],
      patient_answers: [],
      staff_transcript: null,
      staff_intent: null,
      user_intent: null,
      user_confirmed_text: null,
      confidence: 0,
      confidence_band: 'UNKNOWN',
      retry_count: 0,
      need_human_help: false,
      has_pending_custom_question: false,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

const DEFAULT_KTP_MOCKUP =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" rx="12" fill="%230284c7"/><rect x="15" y="15" width="450" height="270" rx="8" fill="none" stroke="%2338bdf8" stroke-width="2"/><text x="240" y="45" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23ffffff" text-anchor="middle">PROVINSI DKI JAKARTA</text><text x="240" y="65" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23ffffff" text-anchor="middle">KOTA JAKARTA SELATAN</text><text x="35" y="105" font-family="monospace" font-weight="bold" font-size="16" fill="%23ffffff">NIK : 3174052108950003</text><text x="35" y="140" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Nama : AHMAD HIDAYAT</text><text x="35" y="165" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Tempat/Tgl Lahir : JAKARTA, 21-08-1995</text><text x="35" y="190" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Jenis Kelamin : LAKI-LAKI</text><text x="35" y="215" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Alamat : JL. SUDIRMAN NO. 45</text><text x="35" y="240" font-family="sans-serif" font-size="13" fill="%23f0f9ff">Agama : ISLAM</text><rect x="340" y="95" width="110" height="150" rx="6" fill="%23e2e8f0" stroke="%2394a3b8" stroke-width="2"/><text x="395" y="180" font-family="sans-serif" font-size="45" text-anchor="middle" fill="%23475569">👤</text></svg>';

  const submitKtpForVerification = useCallback((imageUrl?: string) => {
    const newState: SessionState = {
      ...session,
      ktp_verification_status: 'PENDING',
      ktp_image_url: imageUrl || DEFAULT_KTP_MOCKUP,
      user_confirmed_text: 'Dokumen KTP Terkirim — Menunggu ACC Petugas Loket',
      confidence: 0.95,
      confidence_band: 'HIGH',
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const approveKtpVerification = useCallback(() => {
    const existingAnswers = session.patient_answers || [];
    const updatedAnswers = [
      ...existingAnswers.filter((a) => a.question !== WORKFLOW_STATES.IDENTITY.questionText),
      {
        question: WORKFLOW_STATES.IDENTITY.questionText,
        answer: 'Dokumen KTP Terverifikasi (Disetujui Petugas)',
        confidence: 0.98,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    const nextConfig = WORKFLOW_STATES.IDENTITY.nextState;

    const newState: SessionState = {
      ...session,
      ktp_verification_status: 'APPROVED',
      user_confirmed_text: 'Dokumen KTP Disetujui Petugas',
      patient_answers: updatedAnswers,
      workflow_state: nextConfig,
      current_question: {
        text: WORKFLOW_STATES[nextConfig].questionText,
        bisindo_video_url: WORKFLOW_STATES[nextConfig].bisindoVideoUrl,
        sign_description: WORKFLOW_STATES[nextConfig].signDescription,
      },
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const rejectKtpVerification = useCallback(() => {
    const newState: SessionState = {
      ...session,
      ktp_verification_status: 'REJECTED',
      user_confirmed_text: 'Dokumen KTP Ditolak — Mohon Ulangi Pemindaian',
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const retryKtpVerification = useCallback(() => {
    const newState: SessionState = {
      ...session,
      ktp_verification_status: 'NONE',
      user_confirmed_text: null,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  }, [session, broadcastUpdate]);

  const contextValue = useMemo(
    () => ({
      session,
      pairingCodeInput,
      setPairingCodeInput,
      startSession,
      pairDevice,
      goToNextState,
      goToPreviousState,
      setWorkflowState,
      setCurrentQuestion,
      setUserIntent,
      setStaffSpeech,
      confirmAnswer,
      requestHumanHelp,
      resumeFromHelp,
      completeSession,
      resetSession,
      startNextPatient,
      submitKtpForVerification,
      approveKtpVerification,
      rejectKtpVerification,
      retryKtpVerification,
    }),
    [
      session,
      pairingCodeInput,
      startSession,
      pairDevice,
      goToNextState,
      goToPreviousState,
      setWorkflowState,
      setCurrentQuestion,
      setUserIntent,
      setStaffSpeech,
      confirmAnswer,
      requestHumanHelp,
      resumeFromHelp,
      completeSession,
      resetSession,
      startNextPatient,
      submitKtpForVerification,
      approveKtpVerification,
      rejectKtpVerification,
      retryKtpVerification,
    ]
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
