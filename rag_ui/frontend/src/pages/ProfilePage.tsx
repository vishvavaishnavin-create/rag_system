import React, { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../services/documentService';
import { changePassword, getActivity, getStats, getTopics } from '../services/profileService';
import type { DailyActivity, TopTopic, UserStats } from '../types/profile';

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number | string, duration = 900): number | string {
  const [display, setDisplay] = useState<number | string>(
    typeof target === 'number' ? 0 : target
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof target !== 'number') {
      setDisplay(target);
      return;
    }
    const end = target;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(end * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  delay?: number;
}

function StatCard({ icon, label, value, delay = 0 }: StatCardProps): React.JSX.Element {
  const animated = useCountUp(value);

  return (
    <div
      className="bg-[#1e2130] rounded-xl p-5 flex flex-col items-center gap-1
        card-hover animate-fadeIn cursor-default"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold text-white">{typeof animated === 'number' ? animated.toLocaleString() : animated}</span>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }): React.JSX.Element {
  return (
    <div
      className="bg-[#1e2130] rounded-xl p-6 animate-fadeIn"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────

export default function ProfilePage(): React.JSX.Element {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const safeToken = token ?? '';

  const [stats, setStats]       = useState<UserStats | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [topics, setTopics]     = useState<TopTopic[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');

  const [oldPw, setOldPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrorKey, setPwErrorKey] = useState(0);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [statsRes, activityRes, topicsRes, docsRes] = await Promise.all([
          getStats(safeToken),
          getActivity(safeToken),
          getTopics(safeToken),
          getDocuments(safeToken),
        ]);
        setStats(statsRes);
        setActivity(activityRes.activity);
        setTopics(topicsRes.topics);
        setDocuments(docsRes.documents);
      } catch {
        setLoadError('Failed to load profile data. Make sure the backend is running.');
      }
    };
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePasswordChange(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      setPwErrorKey((k) => k + 1);
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      setPwErrorKey((k) => k + 1);
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(safeToken, oldPw, newPw);
      setPwSuccess(true);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
      setPwErrorKey((k) => k + 1);
    } finally {
      setPwLoading(false);
    }
  }

  const isGoogleUser = user?.auth_provider === 'google';

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-[#1e2130] border-b border-gray-700 sticky top-0 z-10 animate-slideDown">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors hover:-translate-x-0.5 active:translate-x-0"
        >
          ← Back to Chat
        </button>
        <div className="flex items-center gap-2">
          <span>👤</span>
          <span className="font-semibold">My Profile</span>
        </div>
        <div className="w-28" />
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {loadError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 text-sm animate-fadeIn">
            {loadError}
          </div>
        )}

        {/* Identity card */}
        <div
          className="bg-[#1e2130] rounded-xl p-6 flex items-center gap-5 animate-fadeIn card-hover cursor-default"
          style={{ animationDelay: '50ms', animationFillMode: 'both' }}
        >
          <div className="w-16 h-16 rounded-full bg-indigo-700 flex items-center justify-center text-2xl font-bold shrink-0 ring-2 ring-indigo-500/30">
            {user?.avatar_url
              ? <img src={user.avatar_url} className="w-16 h-16 rounded-full object-cover" alt={user.username} />
              : (user?.username?.[0]?.toUpperCase() ?? '?')
            }
          </div>
          <div>
            <p className="text-xl font-semibold">{user?.username}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Member since: {stats?.member_since ?? '…'}</p>
            {isGoogleUser && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-blue-900/40 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                <svg width="12" height="12" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Google account
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon="📁" label="Total Sessions"   value={stats?.total_sessions ?? '…'} delay={80}  />
          <StatCard icon="💬" label="Total Messages"   value={stats?.total_messages ?? '…'} delay={155} />
          <StatCard icon="📄" label="PDFs Indexed"     value={stats?.pdfs_uploaded ?? '…'}  delay={230} />
          <StatCard icon="📊" label="Avg / Session"    value={stats?.avg_messages_per_session ?? '…'} delay={305} />
        </div>

        {/* Most active day */}
        {stats?.most_active_day && stats.most_active_day !== 'N/A' && (
          <div
            className="bg-[#1e2130] rounded-xl px-6 py-4 flex items-center gap-3 animate-fadeIn"
            style={{ animationDelay: '350ms', animationFillMode: 'both' }}
          >
            <span className="text-lg">🔥</span>
            <span className="text-sm text-gray-300">
              Most active day:{' '}
              <span className="text-white font-medium">{stats.most_active_day}</span>
            </span>
          </div>
        )}

        {/* Activity chart */}
        <Section title="📈 Message Activity (Last 7 Days)" delay={400}>
          {activity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="date" stroke="#718096" tick={{ fontSize: 12 }} />
                <YAxis stroke="#718096" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="messages" fill="#6366f1" name="Messages"  radius={[3, 3, 0, 0]} isAnimationActive />
                <Bar dataKey="questions" fill="#a855f7" name="Questions" radius={[3, 3, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No activity yet.</p>
          )}
        </Section>

        {/* Topics chart */}
        <Section title="🔥 Top Topics" delay={480}>
          {topics.length > 0 ? (
            <ResponsiveContainer width="100%" height={topics.length * 48 + 40}>
              <BarChart layout="vertical" data={topics} margin={{ left: 16, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" horizontal={false} />
                <XAxis type="number" stroke="#718096" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="topic" type="category" stroke="#718096" tick={{ fontSize: 12 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#e5e7eb' }} />
                <Bar dataKey="count" fill="#6366f1" name="Questions" radius={[0, 3, 3, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Ask some questions about AI topics to see them here.</p>
          )}
        </Section>

        {/* PDFs list */}
        <Section title="📄 My Uploaded PDFs" delay={540}>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 bg-[#0f1117] rounded-lg px-4 py-3 text-sm
                    animate-fadeInLeft hover:translate-x-1 hover:bg-[#15171f] transition-all duration-150"
                  style={{ animationDelay: `${560 + i * 60}ms`, animationFillMode: 'both' }}
                >
                  <span className="text-base">📄</span>
                  <span className="text-gray-200">{doc}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No PDFs uploaded yet. Go to the chat and upload one!</p>
          )}
        </Section>

        {/* Change password */}
        <Section title="⚙️ Change Password" delay={600}>
          {isGoogleUser ? (
            <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-300">
              <span>🔒</span>
              <span>Your account uses Google login. Password change is not available.</span>
            </div>
          ) : (
            <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4 max-w-sm">
              {['Current password', 'New password', 'Confirm new password'].map((lbl, i) => {
                const val  = [oldPw,   newPw,      confirmPw][i];
                const setter = [setOldPw, setNewPw, setConfirmPw][i];
                return (
                  <div
                    key={lbl}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${620 + i * 60}ms`, animationFillMode: 'both' }}
                  >
                    <label className="block text-xs text-gray-400 mb-1">{lbl}</label>
                    <input
                      type="password"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      required
                      className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                );
              })}

              {pwError && (
                <p key={pwErrorKey} className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 animate-shake animate-fadeIn">
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 animate-slideDown flex items-center gap-2">
                  <span className="animate-checkBounce inline-block">✓</span>
                  Password updated successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="btn-press bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {pwLoading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </Section>

      </div>
    </div>
  );
}
