import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { SUBJECTS } from '../data/subjects';
import QuizTakePage from './QuizTakePage';

const TABS = ['Pending', 'Completed', 'Daily'];

export default function QuizPage() {
  const { quizzes, getDailyQuizzes, loadingData } = useAppData();
  const [activeTab,    setActiveTab]    = useState('Pending');
  const [takingQuiz,   setTakingQuiz]   = useState(null);
  const [dailyQuizzes, setDailyQuizzes] = useState(null);

  if (takingQuiz) {
    return <QuizTakePage quiz={takingQuiz} onBack={() => setTakingQuiz(null)} />;
  }

  const pending   = quizzes.filter(q => q.status === 'pending');
  const completed = quizzes.filter(q => q.status === 'completed').sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const daily     = dailyQuizzes || getDailyQuizzes();

  const handleLoadDaily = () => setDailyQuizzes(getDailyQuizzes());

  const scoreColor = (s) => s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = (s) => s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : 'D';

  const renderPending = () => (
    <div className="quiz-list">
      {loadingData ? (
        <div className="loading-row"><div className="spinner-lg" /></div>
      ) : pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No Pending Quizzes</h3>
          <p>Ask the AI Tutor a question — a quiz will be automatically generated from your doubt!</p>
        </div>
      ) : pending.map(quiz => {
        const subj = SUBJECTS.find(s => s.id === quiz.subject);
        return (
          <div key={quiz.id} className="quiz-card" onClick={() => setTakingQuiz(quiz)}>
            <div className="quiz-card-left">
              <div className="quiz-subject-icon" style={{ background: (subj?.color || '#6C63FF') + '22' }}>
                {subj?.icon || '📝'}
              </div>
              <div>
                <div className="quiz-card-title">{quiz.title}</div>
                <div className="quiz-card-meta">
                  <span className="quiz-tag">{subj?.label || quiz.subject}</span>
                  <span className="quiz-tag">{quiz.questions?.length || 5} questions</span>
                  <span className="quiz-tag">{quiz.source === 'ai-tutor' ? 'AI Generated' : 'Daily'}</span>
                </div>
              </div>
            </div>
            <button className="quiz-start-btn">Start →</button>
          </div>
        );
      })}
    </div>
  );

  const renderCompleted = () => (
    <div className="quiz-list">
      {completed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>No Completed Quizzes</h3>
          <p>Take a pending quiz to see your results here!</p>
        </div>
      ) : completed.map(quiz => {
        const subj  = SUBJECTS.find(s => s.id === quiz.subject);
        const color = scoreColor(quiz.score);
        return (
          <div key={quiz.id} className="quiz-card completed-card">
            <div className="quiz-card-left">
              <div className="quiz-subject-icon" style={{ background: (subj?.color || '#6C63FF') + '22' }}>
                {subj?.icon || '📝'}
              </div>
              <div>
                <div className="quiz-card-title">{quiz.title}</div>
                <div className="quiz-card-meta">
                  <span className="quiz-tag">{subj?.label || quiz.subject}</span>
                  <span className="quiz-tag">{quiz.correctCount}/{quiz.questions?.length || 5} correct</span>
                  {quiz.completedAt && (
                    <span className="quiz-tag">{new Date(quiz.completedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="score-badge" style={{ background: color + '22', color, borderColor: color + '44' }}>
              <div className="score-grade">{scoreLabel(quiz.score)}</div>
              <div className="score-pct">{quiz.score}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDaily = () => (
    <div>
      <div className="daily-header">
        <p>Fresh quizzes every day based on your subjects</p>
        <button className="refresh-btn" onClick={handleLoadDaily}>🔄 Refresh</button>
      </div>
      <div className="quiz-list">
        {daily.map(quiz => {
          const subj = SUBJECTS.find(s => s.id === quiz.subject);
          return (
            <div key={quiz.id} className="quiz-card" onClick={() => setTakingQuiz(quiz)}>
              <div className="quiz-card-left">
                <div className="quiz-subject-icon" style={{ background: (subj?.color || '#6C63FF') + '22' }}>
                  {subj?.icon || '📝'}
                </div>
                <div>
                  <div className="quiz-card-title">{quiz.title}</div>
                  <div className="quiz-card-meta">
                    <span className="quiz-tag">{subj?.label || quiz.subject}</span>
                    <span className="quiz-tag">{quiz.questions?.length} questions</span>
                    <span className="quiz-tag daily-tag">📅 Daily</span>
                  </div>
                </div>
              </div>
              <button className="quiz-start-btn">Start →</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title">Quizzes 📝</h1>
        <p className="page-sub">Test your knowledge and track your progress</p>
      </div>

      {/* Tab Bar */}
      <div className="quiz-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`quiz-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab === 'Pending'   && `⏳ Pending (${pending.length})`}
            {tab === 'Completed' && `✅ Completed (${completed.length})`}
            {tab === 'Daily'     && '📅 Daily'}
          </button>
        ))}
      </div>

      {activeTab === 'Pending'   && renderPending()}
      {activeTab === 'Completed' && renderCompleted()}
      {activeTab === 'Daily'     && renderDaily()}
    </div>
  );
}
