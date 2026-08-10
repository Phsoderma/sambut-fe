'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  setUserIntent: (intent: UserIntent, confidence?: number) => void;
  setStaffSpeech: (text: string, intent?: StaffIntent) => void;
  confirmAnswer: (confirmedText: string) => void;
  requestHumanHelp: () => void;
  resetSession: () => void;
}

const DEFAULT_SESSION: SessionState = {
  session_id: 'SMB-8821',
  role_status: 'WAITING',
  workflow_state: 'START',
  current_question: {
    text: WORKFLOW_STATES.START.questionText,
    sign_description: WORKFLOW_STATES.START.signDescription,
  },
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

  // Sync state across browser tabs using BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('sambut_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse stored session:', e);
      }
    }

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'SESSION_UPDATE') {
        setSession(event.data.payload);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const broadcastUpdate = (updatedState: SessionState) => {
    setSession(updatedState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sambut_session', JSON.stringify(updatedState));
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ type: 'SESSION_UPDATE', payload: updatedState });
        channel.close();
      } catch (e) {
        console.error('BroadcastChannel error:', e);
      }
    }
  };

  const startSession = (customCode?: string) => {
    const code = customCode || `SMB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newState: SessionState = {
      ...DEFAULT_SESSION,
      session_id: code,
      role_status: 'WAITING',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  };

  const pairDevice = (code: string): boolean => {
    if (!code || code.trim().toUpperCase() !== session.session_id.toUpperCase()) {
      return false;
    }
    const newState: SessionState = {
      ...session,
      role_status: 'PAIRED',
      workflow_state: 'PATIENT_STATUS',
      current_question: {
        text: WORKFLOW_STATES.PATIENT_STATUS.questionText,
        sign_description: WORKFLOW_STATES.PATIENT_STATUS.signDescription,
      },
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
    return true;
  };

  const setWorkflowState = (state: WorkflowState) => {
    const config = WORKFLOW_STATES[state];
    const newState: SessionState = {
      ...session,
      workflow_state: state,
      current_question: {
        text: config.questionText,
        bisindo_video_url: config.bisindoVideoUrl,
        sign_description: config.signDescription,
      },
      user_intent: null,
      confidence: 0,
      confidence_band: 'UNKNOWN',
      need_human_help: false,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  };

  const goToNextState = () => {
    const currentConfig = WORKFLOW_STATES[session.workflow_state];
    if (currentConfig && currentConfig.nextState) {
      setWorkflowState(currentConfig.nextState);
    }
  };

  const goToPreviousState = () => {
    const currentConfig = WORKFLOW_STATES[session.workflow_state];
    if (currentConfig && currentConfig.previousState) {
      setWorkflowState(currentConfig.previousState);
    }
  };

  const setUserIntent = (intent: UserIntent, confidence: number = 0.85) => {
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
  };

  const setStaffSpeech = (text: string, intent?: StaffIntent) => {
    const newState: SessionState = {
      ...session,
      staff_transcript: text,
      staff_intent: intent || 'TANYA_KELUHAN',
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  };

  const confirmAnswer = (confirmedText: string) => {
    const newState: SessionState = {
      ...session,
      user_confirmed_text: confirmedText,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  };

  const requestHumanHelp = () => {
    const newState: SessionState = {
      ...session,
      need_human_help: true,
      updated_at: new Date().toISOString(),
    };
    broadcastUpdate(newState);
  };

  const resetSession = () => {
    startSession();
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        pairingCodeInput,
        setPairingCodeInput,
        startSession,
        pairDevice,
        goToNextState,
        goToPreviousState,
        setWorkflowState,
        setUserIntent,
        setStaffSpeech,
        confirmAnswer,
        requestHumanHelp,
        resetSession,
      }}
    >
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
