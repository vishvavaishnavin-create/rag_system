/**
 * useChat — manages chat sessions and message state.
 * Encapsulates all session CRUD and message sending logic.
 */
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { askQuestion } from '../services/chatService';
import { createSession, deleteSession, getSession, getSessions } from '../services/historyService';
import type { AskRequest, HistoryItem, Message } from '../types/chat';
import type { Session } from '../types/history';

export interface UseChatReturn {
  messages: Message[];
  sessions: Session[];
  currentSessionId: string | null;
  loading: boolean;
  error: string;
  setError: (e: string) => void;
  fetchSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createNewChat: () => Promise<string | null>;
  removeSession: (sessionId: string) => Promise<void>;
  sendMessage: (question: string, sessionId?: string | null) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const { token } = useAuth();
  const safeToken = token ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextId = useRef<number>(1);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const data = await getSession(sessionId, safeToken);
      nextId.current = 1;
      const restored: Message[] = data.messages.map((m) => ({
        id: nextId.current++,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp,
      }));
      setMessages(restored);
      setCurrentSessionId(sessionId);
      setError('');
    } catch {
      setError('Failed to load session.');
    }
  }, [safeToken]);

  const fetchSessions = useCallback(async (): Promise<void> => {
    try {
      const res = await getSessions(safeToken);
      setSessions(res.sessions);
      if (res.sessions.length > 0) await loadSession(res.sessions[0].session_id);
    } catch { /* non-critical */ }
  }, [safeToken, loadSession]);

  const createNewChat = useCallback(async (): Promise<string | null> => {
    try {
      const sessionId = await createSession(safeToken);
      const now = new Date().toISOString();
      const newSession: Session = {
        session_id: sessionId,
        title: 'New Chat',
        created_at: now,
        updated_at: now,
        message_count: 0,
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
      setMessages([]);
      nextId.current = 1;
      setError('');
      return sessionId;
    } catch {
      setError('Could not create new chat.');
      return null;
    }
  }, [safeToken]);

  const removeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await deleteSession(sessionId, safeToken);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        nextId.current = 1;
      }
    } catch {
      setError('Could not delete session.');
    }
  }, [safeToken, currentSessionId]);

  const sendMessage = useCallback(async (question: string, sessionId?: string | null): Promise<void> => {
    const sid = sessionId ?? currentSessionId;
    if (!question.trim() || loading || !sid) return;

    setError('');
    setLoading(true);

    const historySnapshot: HistoryItem[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const isFirstMessage = messages.length === 0;
    const userMsg: Message = {
      id: nextId.current++,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (isFirstMessage) {
      const title = question.slice(0, 40).trim();
      setSessions((prev) =>
        prev.map((s) => (s.session_id === sid ? { ...s, title } : s))
      );
    }

    try {
      const req: AskRequest = { question, history: historySnapshot, session_id: sid };
      const res = await askQuestion(req, safeToken);
      const assistantMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === sid
            ? { ...s, message_count: s.message_count + 2, updated_at: new Date().toISOString() }
            : s
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [safeToken, currentSessionId, loading, messages]);

  return {
    messages, sessions, currentSessionId, loading, error, setError,
    fetchSessions, loadSession, createNewChat, removeSession, sendMessage,
  };
}
