import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddTopicModal from '../components/AddTopicModal';
import OnboardingTour from '../components/OnboardingTour';
import PdfUploadPanel from '../components/PdfUploadPanel';
import type { UploadStatus } from '../components/PdfUploadPanel';
import { useAuth } from '../context/AuthContext';
import { askQuestion } from '../services/chatService';
import { getDocuments, uploadPDF } from '../services/documentService';
import { createSession, deleteSession, getSession, getSessions } from '../services/historyService';
import { getTopics, removeTopic } from '../services/topicsService';
import type { AskRequest, HistoryItem, Message } from '../types/chat';
import type { Session } from '../types/history';
import type { TopicsAvailableResponse, UserTopic } from '../types/topics';

// ── Web Speech API type declarations ─────────────────────────────────────────

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  readonly 0: SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  interimResults: boolean;
  continuous: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ── Topic emoji map ───────────────────────────────────────────────────────────

const TOPIC_EMOJIS: Record<string, string> = {
  'artificial intelligence': '🤖',
  'machine learning': '🧠',
  'deep learning': '🔬',
  'natural language processing': '💬',
  'neural network': '🕸️',
  'neural networks': '🕸️',
};

function topicEmoji(name: string): string {
  return TOPIC_EMOJIS[name.toLowerCase()] ?? '📚';
}

// ── Session grouping ──────────────────────────────────────────────────────────

function groupSessions(sessions: Session[]): [string, Session[]][] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, Session[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const sd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (sd >= today) groups['Today'].push(s);
    else if (sd >= yesterday) groups['Yesterday'].push(s);
    else if (sd >= weekAgo) groups['This Week'].push(s);
    else groups['Older'].push(s);
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────

export default function ChatPage(): React.JSX.Element {
  const { token, user, logout, isAdmin, markTourComplete } = useAuth();
  const navigate = useNavigate();
  const safeToken = token ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Topics + modal
  const [topics, setTopics] = useState<TopicsAvailableResponse | null>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);

  // Empty-state drag-drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropStatus, setDropStatus] = useState<UploadStatus>('idle');
  const [dropMsg, setDropMsg] = useState('');

  const nextId = useRef<number>(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ── Tour refs ────────────────────────────────────────────────────────────────
  const sidebarRef = useRef<HTMLElement>(null);
  const uploadRef  = useRef<HTMLDivElement>(null);
  const chatRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const micRef     = useRef<HTMLButtonElement>(null);

  const showTour =
    !!user &&
    !user.has_seen_tour &&
    !localStorage.getItem(`wikirag_tour_done_${user.username}`);

  const handleTourComplete = async () => {
    if (user) localStorage.setItem(`wikirag_tour_done_${user.username}`, '1');
    await markTourComplete();
  };

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setSpeechSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    void fetchDocuments();
    void fetchSessions();
    void fetchTopics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchDocuments(): Promise<void> {
    try {
      const res = await getDocuments(safeToken);
      setDocuments(res.documents);
    } catch { /* non-critical */ }
  }

  async function fetchSessions(): Promise<void> {
    try {
      const res = await getSessions(safeToken);
      setSessions(res.sessions);
      if (res.sessions.length > 0) await loadSession(res.sessions[0].session_id);
    } catch { /* non-critical */ }
  }

  async function fetchTopics(): Promise<void> {
    try {
      const res = await getTopics(safeToken);
      setTopics(res);
    } catch { /* non-critical */ }
  }

  // ── Session management ───────────────────────────────────────────────────────
  async function loadSession(sessionId: string): Promise<void> {
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
  }

  async function handleNewChat(): Promise<void> {
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
    } catch {
      setError('Could not create new chat.');
    }
  }

  async function handleDeleteSession(sessionId: string): Promise<void> {
    setDeletingIds((prev) => new Set(prev).add(sessionId));
    await new Promise((r) => setTimeout(r, 280));
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
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }

  // ── Messaging ────────────────────────────────────────────────────────────────
  async function sendMessage(questionOverride?: string, forceSessionId?: string, historyOverride?: Message[]): Promise<void> {
    const question = (questionOverride ?? input).trim();
    const sid = forceSessionId ?? currentSessionId;
    if (!question || loading || !sid) return;

    setInput('');
    setError('');
    setLoading(true);

    const baseMessages = historyOverride ?? messages;
    const historySnapshot: HistoryItem[] = baseMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const isFirstMessage = baseMessages.length === 0;
    const userMsg: Message = {
      id: nextId.current++,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };
    if (historyOverride) {
      setMessages([...historyOverride, userMsg]);
    } else {
      setMessages((prev) => [...prev, userMsg]);
    }

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
  }

  // ── Topic chip click — creates session if none active ────────────────────────
  async function handleChipClick(topicName: string): Promise<void> {
    let sid = currentSessionId;
    if (!sid) {
      try {
        sid = await createSession(safeToken);
        const now = new Date().toISOString();
        setSessions((prev) => [
          { session_id: sid!, title: 'New Chat', created_at: now, updated_at: now, message_count: 0 },
          ...prev,
        ]);
        setCurrentSessionId(sid);
      } catch {
        setError('Could not start a chat session.');
        return;
      }
    }
    await sendMessage(`Tell me about ${topicName}`, sid);
  }

  // ── Topic management ─────────────────────────────────────────────────────────
  function handleTopicAdded(topic: UserTopic): void {
    setTopics((prev) =>
      prev
        ? {
            ...prev,
            user_topics: [...prev.user_topics, topic],
            all_topics: [...prev.all_topics, topic.name],
          }
        : prev
    );
  }

  async function handleTopicRemove(name: string): Promise<void> {
    try {
      await removeTopic(name, safeToken);
      setTopics((prev) =>
        prev
          ? {
              ...prev,
              user_topics: prev.user_topics.filter((t) => t.name !== name),
              all_topics: prev.all_topics.filter((t) => t !== name),
            }
          : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not remove topic.');
    }
  }

  // ── Drag-and-drop in empty state ─────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
  }

  async function handleDrop(e: React.DragEvent): Promise<void> {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setDropStatus('error');
      setDropMsg('Only PDF files are supported.');
      setTimeout(() => setDropStatus('idle'), 3000);
      return;
    }
    setDropStatus('uploading');
    setDropMsg('');
    try {
      const res = await uploadPDF(file, safeToken);
      setDropStatus('success');
      setDropMsg(`"${res.filename}" — ${res.chunks_added} chunks added`);
      void fetchDocuments();
      setTimeout(() => setDropStatus('idle'), 4000);
    } catch (err: unknown) {
      setDropStatus('error');
      setDropMsg(err instanceof Error ? err.message : 'Upload failed.');
      setTimeout(() => setDropStatus('idle'), 3000);
    }
  }

  // ── Voice input ──────────────────────────────────────────────────────────────
  function toggleListening(): void {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new API();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      setInput(parts.join(''));
    };
    recognition.onend  = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleUploadSuccess(filename: string): void {
    void fetchDocuments();
    void sendMessage(`What is this document about? (${filename})`);
  }

  const handleCopy = async (id: number, content: string): Promise<void> => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditStart = (msg: Message): void => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSend = async (): Promise<void> => {
    if (!editText.trim() || !editingId) return;
    const editIndex = messages.findIndex((m) => m.id === editingId);
    const newMessages = messages.slice(0, editIndex);
    setEditingId(null);
    await sendMessage(editText.trim(), undefined, newMessages);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const grouped = groupSessions(sessions);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-white">

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          sidebarRef={sidebarRef}
          uploadRef={uploadRef}
          chatRef={chatRef}
          inputRef={inputRef}
          micRef={micRef}
          onComplete={() => void handleTourComplete()}
        />
      )}

      {/* Add Topic Modal */}
      <AddTopicModal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        token={safeToken}
        userTopics={topics?.user_topics ?? []}
        onTopicAdded={handleTopicAdded}
        onTopicRemoved={(name) => {
          setTopics((prev) =>
            prev
              ? {
                  ...prev,
                  user_topics: prev.user_topics.filter((t) => t.name !== name),
                  all_topics: prev.all_topics.filter((t) => t !== name),
                }
              : prev
          );
        }}
      />

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-[#1e2130] border-b border-gray-700 shrink-0 animate-slideDown">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden text-gray-400 hover:text-white mr-1 text-lg leading-none transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <span className="text-xl">📚</span>
          <span className="font-bold text-lg">WikiRAG</span>
          <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded-full ml-2">
            Wikipedia
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors hover:scale-105 active:scale-95"
              title="View profile"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-7 h-7 rounded-full object-cover" alt={user.username} />
              ) : (
                <span>{user.username}</span>
              )}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="btn-press text-xs text-purple-300 bg-purple-900 hover:bg-purple-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              🛡️ Admin
            </button>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="btn-press text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Profile
          </button>
          <button
            onClick={logout}
            className="btn-press text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside
          ref={sidebarRef}
          className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-[260px] shrink-0 bg-[#0d0f1a] border-r border-gray-800 overflow-hidden`}
        >
          <div className="p-3 shrink-0">
            <button
              onClick={() => void handleNewChat()}
              className="btn-press w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors group"
            >
              <span className="inline-block transition-transform duration-200 group-hover:rotate-90">+</span>
              {' '}New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-500 text-center mt-6 px-4">No chats yet. Start one!</p>
            )}

            {grouped.map(([label, items]) => (
              <div key={label} className="mb-3">
                <p className="text-xs text-gray-500 uppercase px-2 py-1 tracking-wider">{label}</p>
                {items.map((session, i) => {
                  const isDeleting = deletingIds.has(session.session_id);
                  return (
                    <div
                      key={session.session_id}
                      onClick={() => void loadSession(session.session_id)}
                      className={`group flex items-center justify-between rounded-lg p-3 mb-1 cursor-pointer
                        transition-all duration-200 animate-fadeInLeft
                        ${isDeleting ? 'opacity-0 -translate-x-4' : ''}
                        ${currentSessionId === session.session_id
                          ? 'bg-indigo-900 border border-indigo-500 border-l-4'
                          : 'bg-[#1e2130] hover:bg-[#252840] hover:translate-x-1'
                        }`}
                      style={{ animationDelay: `${Math.min(i, 6) * 60}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-sm text-white truncate">{session.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {session.message_count} msg{session.message_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDeleteSession(session.session_id); }}
                        className="text-gray-500 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 text-base leading-none hover:scale-110 active:scale-90"
                        title="Delete session"
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* PDF upload panel */}
          <div ref={uploadRef}>
            <PdfUploadPanel
              token={safeToken}
              documents={documents}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>

          {/* Message list */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* ── Rich empty state ── */}
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-full gap-6 py-6 animate-fadeIn">

                {/* Header */}
                <div className="text-center">
                  <span className="text-4xl animate-float inline-block mb-2">💬</span>
                  <h2 className="text-xl font-semibold text-white">Ask WikiRAG</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Wikipedia knowledge + your PDFs, all in one place
                  </p>
                </div>

                {/* Topics section */}
                <div className="w-full max-w-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      📚 Wikipedia Topics
                    </h3>
                    <button
                      onClick={() => setShowTopicModal(true)}
                      className="btn-press text-xs bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300
                        border border-indigo-700 px-3 py-1 rounded-lg transition-colors"
                    >
                      + Add Topic
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {topics ? (
                      <>
                        {topics.default_topics.map((topic, i) => (
                          <button
                            key={topic}
                            onClick={() => void handleChipClick(topic)}
                            className="flex items-center gap-1.5 bg-[#1e2130] hover:bg-[#252840]
                              border border-gray-700 hover:border-indigo-500
                              text-sm text-gray-300 hover:text-white
                              px-3 py-1.5 rounded-full transition-all duration-150 btn-press animate-fadeIn"
                            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                          >
                            <span>{topicEmoji(topic)}</span>
                            {topic}
                          </button>
                        ))}
                        {topics.user_topics.map((topic, i) => (
                          <div key={topic.name} className="group relative">
                            <button
                              onClick={() => void handleChipClick(topic.name)}
                              className="flex items-center gap-1.5 bg-indigo-900/20 hover:bg-indigo-900/40
                                border border-indigo-700 text-sm text-indigo-200 hover:text-white
                                px-3 py-1.5 rounded-full transition-all duration-150 btn-press animate-fadeIn pr-7"
                              style={{
                                animationDelay: `${(topics.default_topics.length + i) * 50}ms`,
                                animationFillMode: 'both',
                              }}
                            >
                              <span>⭐</span>
                              {topic.name}
                            </button>
                            <button
                              onClick={() => void handleTopicRemove(topic.name)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs
                                text-indigo-400 hover:text-red-400
                                opacity-0 group-hover:opacity-100 transition-all duration-150 leading-none"
                              title="Remove topic"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </>
                    ) : (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-8 w-32 bg-[#1e2130] rounded-full animate-shimmer"
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full max-w-2xl h-px bg-gray-800" />

                {/* PDF drop zone */}
                <div className="w-full max-w-2xl">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    📄 Your Documents
                  </h3>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => void handleDrop(e)}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
                      ${isDragOver
                        ? 'border-indigo-400 bg-indigo-900/20 scale-[1.01]'
                        : dropStatus === 'uploading'
                        ? 'border-indigo-500 bg-[#1e2130]'
                        : 'border-gray-700 hover:border-gray-500 bg-[#0d0f1a]/60 hover:bg-[#1e2130]/50'
                      }`}
                  >
                    {dropStatus === 'uploading' ? (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span className="text-sm text-gray-400">Uploading…</span>
                      </div>
                    ) : dropStatus === 'success' ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl animate-checkBounce inline-block">✓</span>
                        <span className="text-sm text-green-400">{dropMsg}</span>
                      </div>
                    ) : dropStatus === 'error' ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xl animate-shake inline-block">⚠️</span>
                        <span className="text-sm text-red-400">{dropMsg}</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">📎</div>
                        <p className="text-sm text-gray-400 mb-1">
                          {isDragOver ? 'Drop to upload PDF' : 'Drag & drop a PDF here'}
                        </p>
                        <p className="text-xs text-gray-600">or use the upload button above</p>
                      </>
                    )}
                  </div>

                  {/* Already-uploaded PDFs */}
                  {documents.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {documents.slice(0, 3).map((doc) => (
                        <button
                          key={doc}
                          onClick={() => void handleChipClick(doc.replace(/\.pdf$/i, ''))}
                          className="flex items-center gap-1.5 text-xs bg-[#1e2130] hover:bg-[#252840]
                            border border-gray-700 text-gray-400 hover:text-gray-200
                            px-2.5 py-1.5 rounded-lg transition-colors btn-press"
                        >
                          <span>📄</span>
                          {doc}
                        </button>
                      ))}
                      {documents.length > 3 && (
                        <span className="text-xs text-gray-500 self-center">
                          +{documents.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-600">Press Enter to send · Shift+Enter for a new line</p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === 'user') {
                if (editingId === msg.id) {
                  return (
                    <div key={msg.id} className="flex justify-end animate-fadeInRight">
                      <div className="w-[75%] bg-indigo-600 rounded-2xl px-4 py-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleEditSend(); }
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                          autoFocus
                          rows={3}
                          className="bg-indigo-700 text-white border border-indigo-400 rounded-xl p-3 w-full min-w-[200px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleEditCancel}
                            className="text-gray-300 hover:text-white text-sm px-3 py-1 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => void handleEditSend()}
                            disabled={!editText.trim()}
                            className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-sm px-4 py-1 rounded-lg transition-colors"
                          >
                            Send ↵
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="group flex justify-end animate-fadeInRight">
                    <div className="relative max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 whitespace-pre-wrap text-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-indigo-900/40">
                      {msg.content}
                      <div className="flex justify-between items-center mt-1">
                        <button
                          onClick={() => handleEditStart(msg)}
                          title="Edit message"
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-300 hover:text-white transition-all duration-200 text-xs leading-none p-0.5"
                        >
                          ✏️
                        </button>
                        <span className="text-xs opacity-40">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="group flex justify-start animate-fadeInLeft">
                  <div className="relative max-w-[75%] bg-[#1e2130] text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 whitespace-pre-wrap text-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-black/30">
                    {msg.content}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs opacity-40">{msg.timestamp}</span>
                      <button
                        onClick={() => void handleCopy(msg.id, msg.content)}
                        title={copiedId === msg.id ? 'Copied!' : 'Copy'}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-all duration-200 text-xs leading-none p-0.5"
                      >
                        {copiedId === msg.id ? '✅' : '📋'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-[#1e2130] rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1.5 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dot"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2 mx-auto max-w-lg animate-fadeIn">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 pb-4 shrink-0">
            <div
              className={`flex gap-2 bg-[#1e2130] border rounded-2xl px-4 py-2
                transition-all duration-200
                ${currentSessionId
                  ? 'border-gray-700 focus-within:border-indigo-500 focus-within:-translate-y-0.5 focus-within:shadow-lg focus-within:shadow-indigo-900/20'
                  : 'border-gray-700 opacity-50'
                }`}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentSessionId ? 'Ask a question…' : 'Create a new chat to start…'}
                rows={1}
                disabled={!currentSessionId || loading}
                className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm disabled:cursor-not-allowed"
              />
              {speechSupported && (
                <div className="relative shrink-0 self-end">
                  {isListening && (
                    <>
                      <span className="absolute inset-0 rounded-xl animate-ripple bg-red-500/25 pointer-events-none" />
                      <span className="absolute inset-0 rounded-xl animate-ripple bg-red-500/15 pointer-events-none" style={{ animationDelay: '0.5s' }} />
                    </>
                  )}
                  <button
                    ref={micRef}
                    type="button"
                    onClick={toggleListening}
                    disabled={!currentSessionId || loading}
                    title={isListening ? 'Listening…' : 'Click to speak'}
                    className={`px-3 py-1.5 rounded-xl text-sm transition-all duration-150 disabled:opacity-40
                      hover:scale-110 active:scale-90
                      ${isListening
                        ? 'bg-red-600 text-white'
                        : 'bg-[#252840] hover:bg-[#2e3155] text-gray-300'
                      }`}
                  >
                    🎤
                  </button>
                </div>
              )}
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading || !currentSessionId}
                className="btn-press bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white px-4 py-1.5 rounded-xl text-sm font-medium transition-colors shrink-0 self-end"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : 'Send'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
