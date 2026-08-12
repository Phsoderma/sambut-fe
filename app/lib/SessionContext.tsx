'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { SessionState, UserIntent, StaffIntent, WorkflowState, CustomQuestionItem } from './types';
import { WORKFLOW_STATES, INTENT_TRANSLATIONS } from './workflow';

interface SessionContextType {
  session: SessionState;
  startSession: () => void;
  startRegistrationByStaff: () => void;
  goToNextState: () => void;
  goToPreviousState: () => void;
  setWorkflowState: (state: WorkflowState) => void;
  setCurrentQuestion: (questionText: string) => void;
  sendCustomQuestion: (questionText: string) => void;
  finishStaffCustomQuestions: () => void;
  setUserIntent: (intent: UserIntent, confidence?: number) => void;
  setStaffSpeech: (text: string, intent?: StaffIntent) => void;
  confirmAnswer: (confirmedText: string) => void;
  confirmAnswerAndAdvance: (confirmedText: string) => void;
  confirmKtpDoc: (status: 'RECEIVED' | 'NOT_AVAILABLE') => void;
  confirmBpjsDoc: (status: 'RECEIVED' | 'NOT_USED') => void;
  requestHumanHelp: () => void;
  resumeFromHelp: () => void;
  completeSession: () => void;
  resetSession: () => void;
  startNextPatient: () => void;
}

const DEFAULT_SESSION: SessionState = {
  session_id: 'SMB-8821',
  role_status: 'PAIRED',
  workflow_state: 'START',
  current_question: {
    text: WORKFLOW_STATES.START.questionText,
    sign_description: WORKFLOW_STATES.START.signDescription,
  },
  question_history: [WORKFLOW_STATES.START.questionText],
  patient_answers: [],
  custom_questions_list: [],
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
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync state helper using functional state update to eliminate stale closures
  const updateSession = useCallback((updater: (prev: SessionState) => SessionState) => {
    setSession((prev) => {
      const newState = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sambut_session', JSON.stringify(newState));
          if (channelRef.current) {
            channelRef.current.postMessage({ type: 'SESSION_UPDATE', payload: newState });
          }
        } catch (e) {
          console.error('Session sync error:', e);
        }
      }
      return newState;
    });
  }, []);

  // Load stored session on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sambut_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSession({
            ...parsed,
            role_status: 'PAIRED',
          });
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

  const startSession = useCallback(() => {
    updateSession(() => ({
      ...DEFAULT_SESSION,
      session_id: 'SMB-8821',
      role_status: 'PAIRED',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [updateSession]);

  const startRegistrationByStaff = useCallback(() => {
    updateSession((prev) => {
      const nextState: WorkflowState = 'PATIENT_STATUS';
      const config = WORKFLOW_STATES[nextState];
      return {
        ...prev,
        role_status: 'PAIRED',
        workflow_state: nextState,
        current_question: {
          text: config.questionText,
          bisindo_video_url: config.bisindoVideoUrl,
          sign_description: config.signDescription,
        },
        question_history: [config.questionText],
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const setWorkflowState = useCallback((state: WorkflowState) => {
    updateSession((prev) => {
      const config = WORKFLOW_STATES[state];
      const newHistory = [...(prev.question_history || [])];
      if (config.questionText && !newHistory.includes(config.questionText)) {
        newHistory.push(config.questionText);
      }

      return {
        ...prev,
        workflow_state: state,
        current_question: {
          text: config.questionText,
          bisindo_video_url: config.bisindoVideoUrl,
          sign_description: config.signDescription,
        },
        question_history: newHistory,
        patient_answers: prev.patient_answers || [],
        user_intent: null,
        confidence: prev.confidence || 0,
        confidence_band: prev.confidence_band || 'UNKNOWN',
        need_human_help: false,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const setCurrentQuestion = useCallback((questionText: string) => {
    updateSession((prev) => {
      const newHistory = [...(prev.question_history || [])];
      if (questionText && newHistory[newHistory.length - 1] !== questionText) {
        newHistory.push(questionText);
      }

      return {
        ...prev,
        current_question: {
          text: questionText,
        },
        question_history: newHistory,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  // Sends staff voice STT or custom text as an active custom question step on patient tablet
  const sendCustomQuestion = useCallback((questionText: string) => {
    updateSession((prev) => {
      const existingCustoms = prev.custom_questions_list || [];
      const newCustomItem: CustomQuestionItem = {
        id: `CQ-${existingCustoms.length + 1}`,
        questionText: questionText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedCustoms = [...existingCustoms, newCustomItem];
      const newHistory = [...(prev.question_history || [])];
      if (questionText && !newHistory.includes(questionText)) {
        newHistory.push(questionText);
      }

      return {
        ...prev,
        workflow_state: 'CUSTOM_QUESTION',
        current_question: {
          text: questionText,
          sign_description: 'Jawab pertanyaan petugas ini melalui BISINDO atau ketikan teks.',
        },
        question_history: newHistory,
        custom_questions_list: updatedCustoms,
        staff_transcript: questionText,
        user_intent: null,
        user_confirmed_text: null,
        need_human_help: false,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  // Staff finishes asking follow-up questions and proceeds to CONFIRM
  const finishStaffCustomQuestions = useCallback(() => {
    updateSession((prev) => {
      const config = WORKFLOW_STATES.CONFIRM;
      return {
        ...prev,
        workflow_state: 'CONFIRM',
        current_question: {
          text: config.questionText,
          bisindo_video_url: config.bisindoVideoUrl,
          sign_description: config.signDescription,
        },
        user_intent: null,
        user_confirmed_text: null,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const goToNextState = useCallback(() => {
    setSession((prev) => {
      const currentConfig = WORKFLOW_STATES[prev.workflow_state];
      if (currentConfig && currentConfig.nextState) {
        setWorkflowState(currentConfig.nextState);
      }
      return prev;
    });
  }, [setWorkflowState]);

  const goToPreviousState = useCallback(() => {
    setSession((prev) => {
      const currentConfig = WORKFLOW_STATES[prev.workflow_state];
      if (currentConfig && currentConfig.previousState) {
        setWorkflowState(currentConfig.previousState);
      }
      return prev;
    });
  }, [setWorkflowState]);

  const setUserIntent = useCallback((intent: UserIntent, confidence: number = 0.85) => {
    updateSession((prev) => {
      let band: SessionState['confidence_band'] = 'HIGH';
      if (confidence < 0.6) band = 'LOW';
      else if (confidence < 0.75) band = 'MEDIUM';
      if (intent === 'UNKNOWN') band = 'UNKNOWN';

      const translation = INTENT_TRANSLATIONS[intent];
      const answerText = translation ? translation.labelText : intent;

      return {
        ...prev,
        user_intent: intent,
        confidence: confidence,
        confidence_band: band,
        user_confirmed_text: answerText,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const setStaffSpeech = useCallback((text: string, intent?: StaffIntent) => {
    sendCustomQuestion(text);
  }, [sendCustomQuestion]);

  const confirmAnswer = useCallback((confirmedText: string) => {
    updateSession((prev) => {
      const existingAnswers = prev.patient_answers || [];
      const questionText = prev.current_question.text || WORKFLOW_STATES[prev.workflow_state]?.questionText || 'Pertanyaan';
      
      const updatedAnswers = [
        ...existingAnswers.filter((a) => a.question !== questionText),
        {
          question: questionText,
          answer: confirmedText,
          confidence: prev.confidence || 0.88,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ];

      return {
        ...prev,
        user_confirmed_text: confirmedText,
        patient_answers: updatedAnswers,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  // Atomic Function: Confirms answer AND advances state in one functional update!
  const confirmAnswerAndAdvance = useCallback((confirmedText: string) => {
    updateSession((prev) => {
      const currentConfig = WORKFLOW_STATES[prev.workflow_state];
      const nextState = currentConfig && currentConfig.nextState ? currentConfig.nextState : prev.workflow_state;
      const nextConfig = WORKFLOW_STATES[nextState];

      const questionText = prev.current_question.text || currentConfig?.questionText || 'Pertanyaan';
      const existingAnswers = prev.patient_answers || [];

      const updatedAnswers = [
        ...existingAnswers.filter((a) => a.question !== questionText),
        {
          question: questionText,
          answer: confirmedText,
          confidence: prev.confidence || 0.88,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ];

      const newHistory = [...(prev.question_history || [])];
      if (nextConfig.questionText && !newHistory.includes(nextConfig.questionText)) {
        newHistory.push(nextConfig.questionText);
      }

      return {
        ...prev,
        workflow_state: nextState,
        current_question: {
          text: nextConfig.questionText,
          bisindo_video_url: nextConfig.bisindoVideoUrl,
          sign_description: nextConfig.signDescription,
        },
        question_history: newHistory,
        user_intent: null,
        user_confirmed_text: confirmedText,
        confidence: prev.confidence || 0.88,
        confidence_band: prev.confidence_band || 'HIGH',
        patient_answers: updatedAnswers,
        need_human_help: false,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const confirmKtpDoc = useCallback((status: 'RECEIVED' | 'NOT_AVAILABLE') => {
    updateSession((prev) => {
      const existingAnswers = prev.patient_answers || [];
      const questionText = WORKFLOW_STATES.IDENTITY.questionText;
      const answerText = status === 'RECEIVED' ? 'Dokumen KTP / KK Diterima' : 'Dokumen KTP / KK Tidak Tersedia';

      const updatedAnswers = [
        ...existingAnswers.filter((a) => a.question !== questionText),
        {
          question: questionText,
          answer: answerText,
          confidence: 1.0,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ];

      return {
        ...prev,
        workflow_state: 'INSURANCE',
        current_question: {
          text: WORKFLOW_STATES.INSURANCE.questionText,
          bisindo_video_url: WORKFLOW_STATES.INSURANCE.bisindoVideoUrl,
          sign_description: WORKFLOW_STATES.INSURANCE.signDescription,
        },
        user_confirmed_text: answerText,
        patient_answers: updatedAnswers,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const confirmBpjsDoc = useCallback((status: 'RECEIVED' | 'NOT_USED') => {
    updateSession((prev) => {
      const existingAnswers = prev.patient_answers || [];
      const questionText = WORKFLOW_STATES.INSURANCE.questionText;
      const answerText = status === 'RECEIVED' ? 'Kartu JKN / BPJS Diterima' : 'Pasien Umum (Tidak Menggunakan BPJS)';

      const updatedAnswers = [
        ...existingAnswers.filter((a) => a.question !== questionText),
        {
          question: questionText,
          answer: answerText,
          confidence: 1.0,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ];

      return {
        ...prev,
        workflow_state: 'DESTINATION',
        current_question: {
          text: WORKFLOW_STATES.DESTINATION.questionText,
          bisindo_video_url: WORKFLOW_STATES.DESTINATION.bisindoVideoUrl,
          sign_description: WORKFLOW_STATES.DESTINATION.signDescription,
        },
        user_confirmed_text: answerText,
        patient_answers: updatedAnswers,
        updated_at: new Date().toISOString(),
      };
    });
  }, [updateSession]);

  const requestHumanHelp = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      need_human_help: true,
      updated_at: new Date().toISOString(),
    }));
  }, [updateSession]);

  const resumeFromHelp = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      need_human_help: false,
      updated_at: new Date().toISOString(),
    }));
  }, [updateSession]);

  const completeSession = useCallback(() => {
    setWorkflowState('COMPLETED');
  }, [setWorkflowState]);

  const resetSession = useCallback(() => {
    updateSession(() => ({
      ...DEFAULT_SESSION,
      session_id: 'SMB-8821',
      role_status: 'PAIRED',
      workflow_state: 'START',
      current_question: {
        text: WORKFLOW_STATES.START.questionText,
        sign_description: WORKFLOW_STATES.START.signDescription,
      },
      question_history: [WORKFLOW_STATES.START.questionText],
      patient_answers: [],
      custom_questions_list: [],
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
    }));
  }, [updateSession]);

  const startNextPatient = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const contextValue = useMemo(
    () => ({
      session,
      startSession,
      startRegistrationByStaff,
      goToNextState,
      goToPreviousState,
      setWorkflowState,
      setCurrentQuestion,
      sendCustomQuestion,
      finishStaffCustomQuestions,
      setUserIntent,
      setStaffSpeech,
      confirmAnswer,
      confirmAnswerAndAdvance,
      confirmKtpDoc,
      confirmBpjsDoc,
      requestHumanHelp,
      resumeFromHelp,
      completeSession,
      resetSession,
      startNextPatient,
    }),
    [
      session,
      startSession,
      startRegistrationByStaff,
      goToNextState,
      goToPreviousState,
      setWorkflowState,
      setCurrentQuestion,
      sendCustomQuestion,
      finishStaffCustomQuestions,
      setUserIntent,
      setStaffSpeech,
      confirmAnswer,
      confirmAnswerAndAdvance,
      confirmKtpDoc,
      confirmBpjsDoc,
      requestHumanHelp,
      resumeFromHelp,
      completeSession,
      resetSession,
      startNextPatient,
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
