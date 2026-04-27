import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigateSignup }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb orb1" />
      <div className="auth-orb orb2" />
      <div className="auth-orb orb3" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <h1 className="auth-logo-title">EduBot AI</h1>
          <p className="auth-logo-sub">Your Personal AI Learning Companion</p>
        </div>

        <div className="auth-heading">
          <h2>Welcome back! 👋</h2>
          <p>Sign in to continue your learning journey</p>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">📧 Email Address</label>
            <input
              className="form-input"
              type="email"
              id="login-email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">🔒 Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                id="login-password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{
                position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)',
              }}>{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <button className="btn-primary-full" id="login-btn" type="submit" disabled={loading}>
            {loading
              ? <><span className="spinner-sm" /> Signing in...</>
              : 'Sign In →'
            }
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account?&nbsp;
          <a id="goto-signup" onClick={onNavigateSignup}>Create one for free</a>
        </div>

        <div className="auth-tip">
          🚀 <strong>New here?</strong> Create a free account and start learning with AI instantly!
        </div>
      </div>
    </div>
  );
}
