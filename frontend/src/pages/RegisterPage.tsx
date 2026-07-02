import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../services/authService';

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

function getPasswordStrength(pw: string): { width: number; label: string; color: string } {
  if (!pw) return { width: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { width: 25,  label: 'Weak',   color: 'bg-red-500' };
  if (score <= 2) return { width: 50,  label: 'Fair',   color: 'bg-yellow-500' };
  if (score <= 3) return { width: 75,  label: 'Good',   color: 'bg-blue-500' };
  return              { width: 100, label: 'Strong', color: 'bg-green-500' };
}

export default function RegisterPage(): React.JSX.Element {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirm.length > 0 && confirm === password;
  const passwordsMismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      setErrorKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      await registerApi({ username, email, password });
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
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
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] py-8">
      <div
        className="w-full max-w-sm bg-[#1e2130] rounded-2xl shadow-2xl p-8 space-y-5 animate-scaleIn"
        style={{ animationDelay: '60ms', animationFillMode: 'both' }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl mb-1 animate-float inline-block">📚</div>
          <h1 className="text-2xl font-bold text-white animate-slideDown" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            WikiRAG
          </h1>
          <p className="text-sm text-gray-400 animate-fadeIn" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
            Create your account
          </p>
        </div>

        {error && (
          <p key={errorKey} className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 animate-shake animate-fadeIn">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
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

          {/* Email */}
          <div className="animate-fadeIn" style={{ animationDelay: '175ms', animationFillMode: 'both' }}>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Password + strength */}
          <div className="animate-fadeIn" style={{ animationDelay: '225ms', animationFillMode: 'both' }}>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              placeholder="••••••••"
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${strength.color}`}
                    style={{ width: `${strength.width}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${strength.color.replace('bg-', 'text-')}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password + match indicator */}
          <div className="animate-fadeIn" style={{ animationDelay: '275ms', animationFillMode: 'both' }}>
            <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="input-glow w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 pr-9 text-white placeholder-gray-500"
                placeholder="••••••••"
              />
              {passwordsMatch && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-400 text-sm animate-checkBounce">
                  ✓
                </span>
              )}
              {passwordsMismatch && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400 text-sm animate-shake">
                  ✗
                </span>
              )}
            </div>
          </div>

          <div className="animate-fadeIn" style={{ animationDelay: '310ms', animationFillMode: 'both' }}>
            <button
              type="submit"
              disabled={loading || passwordsMismatch}
              className="btn-press w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 animate-fadeIn" style={{ animationDelay: '330ms', animationFillMode: 'both' }}>
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Google button */}
        <div className="animate-fadeIn" style={{ animationDelay: '355ms', animationFillMode: 'both' }}>
          <button
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading}
            className="btn-press w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:pointer-events-none text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-300"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 animate-fadeIn" style={{ animationDelay: '375ms', animationFillMode: 'both' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-indigo-400 after:transition-all hover:after:w-full"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
