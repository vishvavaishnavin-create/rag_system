import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage(): React.JSX.Element {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      loginWithToken(token)
        .then(() => navigate('/'))
        .catch(() => navigate('/login?error=google_failed'));
    } else {
      navigate('/login?error=google_failed');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="text-white text-center space-y-3">
        <div className="text-4xl animate-spin inline-block">⚙️</div>
        <p className="text-gray-300">Signing you in…</p>
      </div>
    </div>
  );
}
