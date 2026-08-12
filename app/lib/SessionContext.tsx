'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  confirmPrediction as confirmPredictionRequest,
  createSession,
  getSnapshot,
  joinSession,
  predictFrames as predictFramesRequest,
  sendEvent,
  websocketUrl,
} from './apiClient';
import {
  ApiError,
  ConnectionStatus,
  Credentials,
  SessionSnapshot,
  SignPrediction,
} from './types';

const STORAGE_KEY = 'sambut_r0_session';

interface SessionContextValue {
  credentials: Credentials | null;
  snapshot: SessionSnapshot | null;
  connection: ConnectionStatus;
  error: string | null;
  busy: boolean;
  createStaffSession: () => Promise<void>;
  joinUserSession: (sessionId: string, joinCode: string) => Promise<void>;
  submitEvent: (eventType: string, payload?: Record<string, unknown>) => Promise<void>;
  predictFrames: (frames: string[]) => Promise<SignPrediction>;
  confirmSign: (predictionId: string) => Promise<void>;
  reconnectNow: () => Promise<void>;
  leaveSession: () => void;
}

function restoredCredentials(): Credentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<Credentials | null>(restoredCredentials);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>(() =>
    restoredCredentials() ? 'CONNECTING' : 'DISCONNECTED',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = useCallback((value: Credentials | null) => {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
    setCredentials(value);
  }, []);

  const applyError = useCallback((caught: unknown) => {
    if (caught instanceof ApiError) {
      if (caught.snapshot) setSnapshot(caught.snapshot);
      setError(caught.code === 'SESSION_EXPIRED' ? 'Sesi telah berakhir. Silakan mulai sesi baru.' : caught.message);
    } else {
      setError('Terjadi gangguan. Silakan coba lagi.');
    }
  }, []);

  const createStaffSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createSession();
      const value: Credentials = {
        role: 'STAFF',
        sessionId: result.session_id,
        token: result.staff_token,
        joinCode: result.join_code,
      };
      persist(value);
      setSnapshot(result.snapshot);
      setConnection('CONNECTING');
    } catch (caught) {
      applyError(caught);
    } finally {
      setBusy(false);
    }
  }, [applyError, persist]);

  const joinUserSession = useCallback(async (sessionId: string, joinCode: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await joinSession(sessionId.trim(), joinCode.trim());
      const value: Credentials = { role: 'USER', sessionId: sessionId.trim(), token: result.user_token };
      persist(value);
      setSnapshot(result.snapshot);
      setConnection('CONNECTING');
    } catch (caught) {
      applyError(caught);
    } finally {
      setBusy(false);
    }
  }, [applyError, persist]);

  const reconnectNow = useCallback(async () => {
    if (!credentials) return;
    setConnection('RECONNECTING');
    setError(null);
    try {
      setSnapshot(await getSnapshot(credentials.sessionId, credentials.token));
      setConnection('CONNECTING');
    } catch (caught) {
      setConnection('DISCONNECTED');
      applyError(caught);
    }
  }, [applyError, credentials]);

  useEffect(() => {
    if (!credentials) return;
    let cancelled = false;
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const retryDelays = [500, 1000, 2000, 4000, 5000];

    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(websocketUrl(credentials.sessionId, credentials.token));
      socket.onopen = () => {
        attempt = 0;
        setConnection('CONNECTED');
        setError(null);
        heartbeat = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send('ping'), 20_000);
      };
      socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === 'SNAPSHOT') setSnapshot(message.snapshot as SessionSnapshot);
        } catch {
          setError('Pembaruan sesi tidak dapat dibaca.');
        }
      };
      socket.onclose = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (cancelled) return;
        if (attempt < retryDelays.length) {
          setConnection('RECONNECTING');
          reconnectTimer = setTimeout(connect, retryDelays[attempt++]);
        } else {
          setConnection('DISCONNECTED');
          setError('Koneksi terputus. Coba hubungkan kembali.');
        }
      };
      socket.onerror = () => socket?.close();
    };

    getSnapshot(credentials.sessionId, credentials.token)
      .then((value) => {
        if (!cancelled) setSnapshot(value);
      })
      .catch((caught) => {
        if (!cancelled) applyError(caught);
      });
    connect();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [applyError, credentials]);

  const submitEvent = useCallback(async (eventType: string, payload: Record<string, unknown> = {}) => {
    if (!credentials || !snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendEvent(
        credentials.sessionId,
        credentials.token,
        snapshot.version,
        eventType,
        payload,
      );
      setSnapshot(result.snapshot);
    } catch (caught) {
      applyError(caught);
    } finally {
      setBusy(false);
    }
  }, [applyError, credentials, snapshot]);

  const predictFrames = useCallback(async (frames: string[]) => {
    if (!credentials || !snapshot) throw new ApiError('NETWORK_ERROR', 'Sesi belum terhubung.', 0);
    return predictFramesRequest(credentials.sessionId, credentials.token, snapshot.version, frames);
  }, [credentials, snapshot]);

  const confirmSign = useCallback(async (predictionId: string) => {
    if (!credentials || !snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmPredictionRequest(
        credentials.sessionId,
        credentials.token,
        snapshot.version,
        predictionId,
      );
      setSnapshot(result.snapshot);
    } catch (caught) {
      applyError(caught);
    } finally {
      setBusy(false);
    }
  }, [applyError, credentials, snapshot]);

  const leaveSession = useCallback(() => {
    persist(null);
    setSnapshot(null);
    setConnection('DISCONNECTED');
    setError(null);
  }, [persist]);

  const value = useMemo<SessionContextValue>(() => ({
    credentials,
    snapshot,
    connection,
    error,
    busy,
    createStaffSession,
    joinUserSession,
    submitEvent,
    predictFrames,
    confirmSign,
    reconnectNow,
    leaveSession,
  }), [
    credentials,
    snapshot,
    connection,
    error,
    busy,
    createStaffSession,
    joinUserSession,
    submitEvent,
    predictFrames,
    confirmSign,
    reconnectNow,
    leaveSession,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
