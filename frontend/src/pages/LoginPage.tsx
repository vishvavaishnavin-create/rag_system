import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../services/authService';

const BASE = 'http://localhost:8000';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

export default function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi({ username, password });
      await login(res.access_token);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/google`);
      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch {
      setError('Could not reach Google. Try again.');
      setErrorKey((k) => k + 1);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div
        className="w-full max-w-sm bg-[#1e2130] rounded-2xl shadow-2xl p-8 space-y-6 animate-scaleIn"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl mb-1 animate-float inline-block">📚</div>
          <h1 className="text-2xl font-bold text-white animate-slideDown" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            WikiRAG
          </h1>
          <p className="text-sm text-gray-400 animate-fadeIn" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
            Sign in to your account
          </p>
        </div>

        {error && (
          <p
            key={errorKey}
            className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 animate-shake animate-fadeIn"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-fadeIn" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              placeholder="your_username"
            />
          </div>

          <div className="animate-fadeIn" style={{ animationDelay: '180ms', animationFillMode: 'both' }}>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div className="animate-fadeIn" style={{ animationDelay: '220ms', animationFillMode: 'both' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-press w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 animate-fadeIn" style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Google button */}
        <div className="animate-fadeIn" style={{ animationDelay: '270ms', animationFillMode: 'both' }}>
          <button
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading}
            className="btn-press w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:pointer-events-none text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-300"
          >
            <span className={`transition-transform duration-300 ${googleLoading ? 'animate-spin' : 'group-hover:rotate-[360deg]'}`}>
              <GoogleIcon />
            </span>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-indigo-400 hover:text-indigo-300 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-indigo-400 after:transition-all hover:after:w-full"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
