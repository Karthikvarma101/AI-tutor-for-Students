import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { SUBJECTS } from '../data/subjects';
import { getOverallProgress, getSubjectStrength, getRecommendations } from '../services/analyticsService';
import SubjectDashboardPage from './SubjectDashboardPage';

export default function HomePage({ onGoToQuiz }) {
  const { currentUser } = useAuth();
  const { analytics, quizzes, loadingData } = useAppData();
  const [selectedSubject, setSelectedSubject] = useState(null);

  if (selectedSubject) {
    return <SubjectDashboardPage subjectId={selectedSubject} onBack={() => setSelectedSubject(null)} onGoToQuiz={onGoToQuiz} />;
  }

  const name         = currentUser?.name?.split(' ')[0] || 'Student';
  const progress     = getOverallProgress(analytics);
  const strengths    = getSubjectStrength(analytics);
  const recs         = getRecommendations(analytics);
  const pending      = quizzes.filter(q => q.status === 'pending').length;
  const completed    = quizzes.filter(q => q.status === 'completed').length;
  const userSubjects = currentUser?.subjects?.length > 0 ? currentUser.subjects : ['math', 'physics', 'chemistry'];

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? '🌅 Good Morning' : hour < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening';

  return (
    <div className="page">
      {/* Greeting */}
      <div className="home-greeting">
        <p className="greeting-time">{greeting}</p>
        <h1 className="greeting-name">{name}! 👋</h1>
        <p className="greeting-sub">Ready to learn something amazing today?</p>
      </div>

      {/* Hero Progress Card */}
      <div className="hero-card">
        <div className="hero-card-row">
          <div>
            <p className="hero-label">Overall Progress</p>
            <div className="hero-percent">{progress}<span className="hero-pct">%</span></div>
            <p className="hero-sub">Average quiz accuracy</p>
          </div>
          <div className="hero-badges">
            <div className="hero-badge">✅ {completed} Completed</div>
            <div className="hero-badge">⏳ {pending} Pending</div>
            <div className="hero-badge">📊 {analytics?.totalQuizzes || 0} Total</div>
          </div>
        </div>
        <div className="hero-progress-bar">
          <div className="hero-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="hero-level">Level: <strong>{currentUser?.level || 'Beginner'}</strong></p>
      </div>

      {loadingData && <div className="loading-row"><div className="spinner-lg" /></div>}

      {/* Pending Quiz Alert */}
      {pending > 0 && (
        <div className="alert-card">
          <span className="alert-icon">⏳</span>
          <div>
            <div className="alert-title">{pending} quiz{pending > 1 ? 'zes' : ''} waiting for you!</div>
            <div className="alert-sub">Head to the Quizzes tab to test your knowledge</div>
          </div>
        </div>
      )}

      {/* Subjects */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Your Subjects</h2>
          <span className="section-badge">{userSubjects.length} subjects</span>
        </div>
        <div className="subjects-grid">
          {userSubjects.map(subjId => {
            const subj  = SUBJECTS.find(s => s.id === subjId);
            const stats = strengths.find(s => s.subject === subjId);
            return (
              <button key={subjId} className="subject-tile" onClick={() => setSelectedSubject(subjId)}
                style={{ '--subject-color': subj?.color || '#6C63FF' }}>
                <div className="subject-tile-icon">{subj?.icon || '📚'}</div>
                <div className="subject-tile-name">{subj?.label || subjId}</div>
                {stats && <div className="subject-tile-pct">{stats.accuracy}%</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Strength Bars */}
      {strengths.length > 0 && (
        <div className="section">
          <h2 className="section-title">Performance Summary</h2>
          <div className="strength-list">
            {strengths.slice(0, 5).map(s => {
              const subj = SUBJECTS.find(sub => sub.id === s.subject);
              const color = s.accuracy >= 80 ? '#10B981' : s.accuracy >= 60 ? '#F59E0B' : '#EF4444';
              return (
                <div key={s.subject} className="strength-row">
                  <div className="strength-info">
                    <span className="strength-icon">{subj?.icon}</span>
                    <span className="strength-name">{subj?.label || s.subject}</span>
                  </div>
                  <div className="strength-bar-wrap">
                    <div className="strength-bar-track">
                      <div className="strength-bar-fill" style={{ width: `${s.accuracy}%`, background: color }} />
                    </div>
                    <span className="strength-pct" style={{ color }}>{s.accuracy}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="section">
        <h2 className="section-title">🤖 AI Recommendations</h2>
        <div className="recs-list">
          {recs.map((rec, i) => (
            <div key={i} className="rec-card animate-in" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="rec-icon">💡</span>
              <p className="rec-text"
                dangerouslySetInnerHTML={{ __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
