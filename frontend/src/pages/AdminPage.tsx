import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  deleteUser,
  deletePDF,
  getActivity,
  getPDFs,
  getStats,
  getUsers,
  toggleUser,
} from '../services/adminService';
import type { AdminPDF, AdminStats, AdminUser, DailyActivity } from '../types/admin';

// ── Toast ──────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }): React.JSX.Element {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const exitTimer   = setTimeout(() => setLeaving(true), 2700);
    const removeTimer = setTimeout(() => onRemove(toast.id), 3000);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative overflow-hidden px-4 py-3 rounded-lg text-sm font-medium shadow-xl w-72
        ${leaving ? 'animate-toast-out' : 'animate-toast-in'}
        ${toast.type === 'success'
          ? 'bg-green-900 text-green-200 border border-green-700'
          : 'bg-red-900 text-red-200 border border-red-700'
        }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`shrink-0 text-base ${toast.type === 'success' ? 'animate-checkBounce inline-block' : 'animate-shake inline-block'}`}>
          {toast.type === 'success' ? '✓' : '✗'}
        </span>
        <span className="truncate">{toast.message}</span>
      </div>
      <div
        className={`absolute bottom-0 left-0 h-0.5 animate-progress
          ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
      />
    </div>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }): React.JSX.Element {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 animate-fadeIn">
      <div className="bg-[#1e2130] border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-press px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-press px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  delay?: number;
}

function StatCard({ label, value, icon, delay = 0 }: StatCardProps): React.JSX.Element {
  const animated = useCountUp(value);

  return (
    <div
      className="bg-[#1e2130] rounded-xl p-6 flex flex-col gap-2 card-hover animate-fadeIn cursor-default"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-3xl font-bold text-white">{animated.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────

export default function AdminPage(): React.JSX.Element {
  const { token, isAdmin } = useAuth();
  const navigate = useNavigate();
  const safeToken = token ?? '';

  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [pdfs, setPdfs]         = useState<AdminPDF[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const [toasts, setToasts]     = useState<Toast[]>([]);
  const [confirm, setConfirm]   = useState<{ message: string; onConfirm: () => void } | null>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    void loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll(): Promise<void> {
    setLoading(true);
    try {
      const [s, u, p, a] = await Promise.all([
        getStats(safeToken),
        getUsers(safeToken),
        getPDFs(safeToken),
        getActivity(safeToken),
      ]);
      setStats(s);
      setUsers(u.users);
      setPdfs(p.pdfs);
      setActivity(a.activity);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function askConfirm(message: string, onConfirm: () => void): void {
    setConfirm({ message, onConfirm });
  }

  async function handleDeleteUser(user: AdminUser): Promise<void> {
    askConfirm(`Delete "${user.username}" and ALL their data? This cannot be undone.`, async () => {
      setConfirm(null);
      try {
        await deleteUser(user.id, safeToken);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        showToast(`User "${user.username}" deleted.`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
      }
    });
  }

  async function handleToggleUser(user: AdminUser): Promise<void> {
    try {
      const res = await toggleUser(user.id, safeToken);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: res.status === 'enabled' } : u))
      );
      showToast(`User "${user.username}" ${res.status}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Toggle failed.', 'error');
    }
  }

  async function handleDeletePDF(pdf: AdminPDF): Promise<void> {
    askConfirm(`Delete "${pdf.filename}" and all its chunks from the knowledge base?`, async () => {
      setConfirm(null);
      try {
        const res = await deletePDF(pdf.filename, safeToken);
        setPdfs((prev) => prev.filter((p) => p.filename !== pdf.filename));
        showToast(`Deleted "${pdf.filename}" (${res.chunks_removed} chunks removed).`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
      }
    });
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-3 bg-[#1e2130] border-b border-gray-700 animate-slideDown">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="font-bold text-lg">WikiRAG Admin</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-press text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          ← Back to Chat
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {/* Shimmer skeletons while loading */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1e2130] rounded-xl p-6 h-28 animate-shimmer" />
              ))}
            </div>
            <div className="bg-[#1e2130] rounded-xl h-48 animate-shimmer" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users"    value={stats.total_users}    icon="👥" delay={0}   />
                <StatCard label="Total Sessions" value={stats.total_sessions} icon="💬" delay={75}  />
                <StatCard label="Total PDFs"     value={stats.total_pdfs}     icon="📄" delay={150} />
                <StatCard label="Total Messages" value={stats.total_messages} icon="📊" delay={225} />
              </div>
            )}

            {/* Activity chart */}
            <div className="bg-[#1e2130] rounded-xl p-6 animate-fadeIn" style={{ animationDelay: '280ms', animationFillMode: 'both' }}>
              <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                Activity — Last 14 Days
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="date" stroke="#718096" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis stroke="#718096" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #4a5568' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#a5b4fc' }} />
                  <Area type="monotone" dataKey="messages" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* User management */}
            <div className="bg-[#1e2130] rounded-xl overflow-hidden animate-fadeIn" style={{ animationDelay: '340ms', animationFillMode: 'both' }}>
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">User Management</h2>
                <input
                  type="text"
                  placeholder="Search users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-glow bg-[#0f1117] border border-gray-600 text-white text-sm px-3 py-1.5 rounded-lg w-48"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d0f1a]">
                    <tr>
                      {['#', 'Username', 'Email', 'Sessions', 'Messages', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium first:px-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        className="border-t border-gray-800 hover:bg-[#252840] transition-colors duration-150
                          animate-fadeIn hover:border-l-2 hover:border-indigo-500/30"
                        style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: 'both' }}
                      >
                        <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">
                          {u.username}
                          {u.is_admin && (
                            <span className="ml-2 text-xs bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded">admin</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{u.email}</td>
                        <td className="px-4 py-3 text-gray-300">{u.session_count}</td>
                        <td className="px-4 py-3 text-gray-300">{u.message_count}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-300
                              ${u.is_active
                                ? 'bg-green-900 text-green-300 animate-pulse'
                                : 'bg-red-900/60 text-red-400'
                              }`}
                          >
                            {u.is_active ? 'active' : 'disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!u.is_admin && (
                              <>
                                <button
                                  onClick={() => void handleToggleUser(u)}
                                  title={u.is_active ? 'Disable user' : 'Enable user'}
                                  className={`text-lg transition-all duration-200 hover:scale-110 active:scale-90
                                    ${u.is_active ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                                >
                                  {u.is_active ? '🟢' : '🔴'}
                                </button>
                                <button
                                  onClick={() => void handleDeleteUser(u)}
                                  title="Delete user"
                                  className="text-gray-500 hover:text-red-400 transition-all duration-150 hover:scale-110 active:scale-90"
                                >
                                  🗑
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-6 text-center text-gray-500 text-sm animate-fadeIn">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PDF management */}
            <div className="bg-[#1e2130] rounded-xl overflow-hidden animate-fadeIn" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">PDF Management</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d0f1a]">
                    <tr>
                      {['Filename', 'Uploaded by', 'Chunks', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium first:px-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pdfs.map((pdf, i) => (
                      <tr
                        key={pdf.filename}
                        className="border-t border-gray-800 hover:bg-[#252840] transition-colors duration-150 animate-fadeIn"
                        style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: 'both' }}
                      >
                        <td className="px-6 py-3 text-white max-w-[260px] truncate">{pdf.filename}</td>
                        <td className="px-4 py-3 text-gray-400">{pdf.uploaded_by}</td>
                        <td className="px-4 py-3 text-gray-300">{pdf.chunk_count}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => void handleDeletePDF(pdf)}
                            title="Delete PDF"
                            className="text-gray-500 hover:text-red-400 transition-all duration-150 hover:scale-110 active:scale-90"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pdfs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-gray-500 text-sm">
                          No PDFs in the knowledge base.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
