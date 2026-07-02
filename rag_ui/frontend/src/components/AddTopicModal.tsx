import React, { useEffect, useRef, useState } from 'react';
import { addTopic, removeTopic } from '../services/topicsService';
import type { UserTopic } from '../types/topics';

type Status = 'idle' | 'validating' | 'indexing' | 'success' | 'error';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  userTopics: UserTopic[];
  onTopicAdded: (topic: UserTopic) => void;
  onTopicRemoved: (name: string) => void;
}

export default function AddTopicModal({
  isOpen,
  onClose,
  token,
  userTopics,
  onTopicAdded,
  onTopicRemoved,
}: Props): React.JSX.Element | null {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [removingName, setRemovingName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setStatus('idle');
      setStatusMsg('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const topic = input.trim();
    if (!topic) return;
    setStatus('validating');
    setStatusMsg('Checking Wikipedia…');
    try {
      setStatus('indexing');
      setStatusMsg('Indexing article into knowledge base…');
      const res = await addTopic(topic, token);
      const newTopic: UserTopic = {
        name: topic,
        wiki_title: res.wiki_title,
        added_at: new Date().toISOString(),
        chunks_count: res.chunks_added,
      };
      onTopicAdded(newTopic);
      setStatus('success');
      setStatusMsg(`"${res.wiki_title}" — ${res.chunks_added} chunks indexed`);
      setInput('');
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 3500);
    } catch (err: unknown) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handleRemove(name: string): Promise<void> {
    setRemovingName(name);
    try {
      await removeTopic(name, token);
      onTopicRemoved(name);
    } catch (err: unknown) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Could not remove topic.');
    } finally {
      setRemovingName(null);
    }
  }

  const busy = status === 'validating' || status === 'indexing';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-700 p-6 animate-scaleIn"
        style={{ animationFillMode: 'both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Wikipedia Topic</h2>
            <p className="text-xs text-gray-500 mt-0.5">Index any Wikipedia article into your knowledge base</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none hover:rotate-90 transition-transform duration-200"
          >
            ✕
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={(e) => void handleAdd(e)} className="flex gap-2 mb-5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); if (status === 'error') { setStatus('idle'); setStatusMsg(''); } }}
            placeholder="e.g. Quantum computing"
            disabled={busy}
            className="input-glow flex-1 bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="btn-press bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            {busy && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>

        {/* Status */}
        {statusMsg && (
          <div
            className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 mb-4 animate-fadeIn
              ${status === 'success' ? 'bg-green-900/20 border border-green-800 text-green-300'
              : status === 'error'   ? 'bg-red-900/20 border border-red-800 text-red-300'
              :                        'bg-indigo-900/20 border border-indigo-800 text-indigo-300'}`}
          >
            <span className="shrink-0 mt-0.5">
              {status === 'success' ? '✓' : status === 'error' ? '⚠' : '⏳'}
            </span>
            {statusMsg}
          </div>
        )}

        {/* User topics list */}
        {userTopics.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Your Custom Topics
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {userTopics.map((topic) => (
                <div
                  key={topic.name}
                  className="flex items-center justify-between bg-[#0f1117] rounded-lg px-3 py-2.5
                    border border-gray-800 animate-fadeInLeft"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">⭐ {topic.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {topic.chunks_count} chunks · {topic.wiki_title}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRemove(topic.name)}
                    disabled={removingName === topic.name}
                    className="text-gray-500 hover:text-red-400 disabled:opacity-40 transition-colors text-base
                      leading-none hover:scale-110 active:scale-90 shrink-0 ml-3"
                    title="Remove topic"
                  >
                    {removingName === topic.name ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : '🗑'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {userTopics.length === 0 && status === 'idle' && (
          <p className="text-xs text-gray-600 text-center py-3">
            No custom topics yet. Add one above!
          </p>
        )}
      </div>
    </div>
  );
}
