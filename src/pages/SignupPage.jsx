import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SUBJECTS } from '../data/subjects';

const CLASSES = ['8th Grade','9th Grade','10th Grade','11th Grade','12th Grade','College (1st Year)','College (2nd Year)','College (3rd Year)','College (4th Year)','Post Graduate','Other'];

export default function SignupPage({ onNavigateLogin }) {
  const { signup } = useAuth();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,  setError]    = useState('');
  const [form, setForm]       = useState({
    name: '', email: '', password: '', confirmPassword: '',
    dob: '', age: '', classYear: '', college: '', subjects: [],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleSubject = (id) =>
    set('subjects', form.subjects.includes(id)
      ? form.subjects.filter(s => s !== id)
      : [...form.subjects, id]);

  const handleStep1 = (e) => {
    e.preventDefault(); setError('');
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setStep(1);
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError('');
    if (!form.dob || !form.classYear || !form.college) { setError('Please fill in all profile fields'); return; }
    if (form.subjects.length === 0) { setError('Please select at least one subject'); return; }
    setLoading(true);
    try {
      await signup(form);
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

      <div className="auth-card" style={{ maxHeight: '96vh', overflowY: 'auto' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <h1 className="auth-logo-title">EduBot AI</h1>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          {['Account', 'Profile & Subjects'].map((label, i) => (
            <div key={i} className={`step-item ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
          <div className="step-line" style={{ width: `${step * 100}%` }} />
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
            {error.includes('already exists') && (
              <a onClick={onNavigateLogin} style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', marginLeft: '0.5rem' }}>Sign in →</a>
            )}
          </div>
        )}

        {step === 0 ? (
          <form className="auth-form" onSubmit={handleStep1}>
            <div className="form-group">
              <label className="form-label">👤 Full Name</label>
              <input className="form-input" id="signup-name" placeholder="e.g. Arjun Sharma"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">📧 Email Address</label>
              <input className="form-input" id="signup-email" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">🔒 Password</label>
              <input className="form-input" id="signup-password" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">🔒 Confirm Password</label>
              <input className="form-input" id="signup-confirm" type="password" placeholder="Re-enter your password"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
            </div>
            <button className="btn-primary-full" type="submit">Continue →</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">📅 Date of Birth</label>
                <input className="form-input" id="signup-dob" type="date"
                  value={form.dob}
                  onChange={e => {
                    set('dob', e.target.value);
                    const age = new Date().getFullYear() - new Date(e.target.value).getFullYear();
                    set('age', age > 0 ? age : '');
                  }} required />
              </div>
              <div className="form-group">
                <label className="form-label">🎂 Age</label>
                <input className="form-input" id="signup-age" type="number" placeholder="Auto-filled"
                  value={form.age} onChange={e => set('age', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">🏫 Class / Year</label>
              <select className="form-input" id="signup-class" value={form.classYear}
                onChange={e => set('classYear', e.target.value)} required>
                <option value="">Select class...</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">🏛️ School / College Name</label>
              <input className="form-input" id="signup-college" placeholder="e.g. Sri Venkateswara College"
                value={form.college} onChange={e => set('college', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">📚 Select Your Subjects</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Choose all subjects you study</p>
              <div className="subjects-checkbox-grid">
                {SUBJECTS.map(s => (
                  <button key={s.id} type="button"
                    className={`subject-checkbox ${form.subjects.includes(s.id) ? 'selected' : ''}`}
                    onClick={() => toggleSubject(s.id)}>
                    <span className="subj-icon">{s.icon}</span>
                    <span className="subj-name">{s.label}</span>
                    {form.subjects.includes(s.id) && <span className="check-mark">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary-half"
                onClick={() => { setStep(0); setError(''); }}>← Back</button>
              <button type="submit" id="signup-btn" className="btn-primary-flex" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Creating...</> : '🚀 Create Account'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-switch">
          Already have an account?&nbsp;<a onClick={onNavigateLogin}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
