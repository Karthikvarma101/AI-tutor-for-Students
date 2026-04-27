import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { SUBJECTS } from '../data/subjects';
import { getSubjectStrength } from '../services/analyticsService';
import QuizTakePage from './QuizTakePage';

const TABS = ['Overview', 'Chats', 'Quizzes', 'Analytics'];

export default function SubjectDashboardPage({ subjectId, onBack, onGoToQuiz }) {
  const { currentUser } = useAuth();
  const { quizzes, analytics, chats, getChatsForUser, addQuiz } = useAppData();
  const [activeTab, setActiveTab] = useState('Overview');
  const [subjectChats, setSubjectChats] = useState([]);
  const [takingQuiz, setTakingQuiz] = useState(null);

  const subj = SUBJECTS.find(s => s.id === subjectId);
  const subjectQuizzes = quizzes.filter(q => q.subject === subjectId);
  const pending   = subjectQuizzes.filter(q => q.status === 'pending');
  const completed = subjectQuizzes.filter(q => q.status === 'completed');

  const allStrengths    = getSubjectStrength(analytics);
  const subjectAnalytics = analytics?.subjects?.[subjectId] || { quizzes: 0, correct: 0, answered: 0 };
  const accuracy = subjectAnalytics.answered > 0
    ? Math.round((subjectAnalytics.correct / subjectAnalytics.answered) * 100)
    : 0;

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      try {
        const msgs = await getChatsForUser(currentUser.id, subjectId);

        setSubjectChats(Array.isArray(msgs) ? msgs : []);
      } catch { setSubjectChats([]); }
    })();
  }, [subjectId]);

  if (takingQuiz) {
    return <QuizTakePage quiz={takingQuiz} onBack={() => setTakingQuiz(null)} />;
  }

  const scoreColor = (s) => s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444';

  const renderOverview = () => (
    <div>
      {/* Stats */}
      <div className="subj-stats-grid">
        <div className="subj-stat">
          <div className="subj-stat-val" style={{ color: scoreColor(accuracy) }}>{accuracy}%</div>
          <div className="subj-stat-label">Accuracy</div>
        </div>
        <div className="subj-stat">
          <div className="subj-stat-val">{subjectAnalytics.quizzes}</div>
          <div className="subj-stat-label">Quizzes Taken</div>
        </div>
        <div className="subj-stat">
          <div className="subj-stat-val">{subjectChats.length}</div>
          <div className="subj-stat-label">Doubts Asked</div>
        </div>
        <div className="subj-stat">
          <div className="subj-stat-val">{pending.length}</div>
          <div className="subj-stat-label">Pending Quizzes</div>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div className="subj-accuracy-card">
        <div className="subj-acc-header">
          <span>Subject Accuracy</span>
          <span style={{ color: scoreColor(accuracy), fontWeight: 700 }}>{accuracy}%</span>
        </div>
        <div className="subj-acc-track">
          <div className="subj-acc-fill" style={{ width: `${accuracy}%`, background: scoreColor(accuracy) }} />
        </div>
        <p className="subj-acc-desc">
          {accuracy >= 80 ? '🌟 Excellent! You\'ve mastered this subject.' :
           accuracy >= 60 ? '📈 Good progress! Keep practicing.' :
           accuracy > 0   ? '📚 Needs improvement. Take more quizzes!' :
                            '🚀 Start taking quizzes to track your progress!'}
        </p>
      </div>

      {/* Recommended Topics */}
      <div>
        <h3 className="sub-section-title">📌 Recommended Topics to Study</h3>
        <div className="topic-chips">
          {getRecommendedTopics(subjectId).map((t, i) => (
            <div key={i} className="topic-chip">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChats = () => (
    <div>
      {subjectChats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{subj?.icon || '💬'}</div>
          <h3>No {subj?.label} Doubts Yet</h3>
          <p>Ask the AI Tutor about {subj?.label} topics — your chats will appear here automatically!</p>
        </div>
      ) : (
        <div className="subj-chat-list">
          {subjectChats.map((msg, i) => (
            <div key={i} className={`chat-mini ${msg.role === 'user' ? 'user-mini' : 'bot-mini'}`}>
              <div className="chat-mini-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
              <div className="chat-mini-content">
                <div className="chat-mini-role">{msg.role === 'user' ? 'You' : 'EduBot AI'}</div>
                <div className="chat-mini-text">{msg.content.substring(0, 200)}{msg.content.length > 200 ? '...' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQuizzes = () => (
    <div>
      {subjectQuizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No {subj?.label} Quizzes Yet</h3>
          <p>Ask the AI Tutor about {subj?.label} to generate quizzes automatically!</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="sub-section-title">⏳ Pending ({pending.length})</h3>
              {pending.map(quiz => (
                <div key={quiz.id} className="quiz-card" onClick={() => setTakingQuiz(quiz)}>
                  <div className="quiz-card-left">
                    <div className="quiz-subject-icon" style={{ background: (subj?.color || '#6C63FF') + '22' }}>{subj?.icon}</div>
                    <div>
                      <div className="quiz-card-title">{quiz.title}</div>
                      <div className="quiz-card-meta">
                        <span className="quiz-tag">{quiz.questions?.length} questions</span>
                      </div>
                    </div>
                  </div>
                  <button className="quiz-start-btn">Start →</button>
                </div>
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 className="sub-section-title">✅ Completed ({completed.length})</h3>
              {completed.map(quiz => (
                <div key={quiz.id} className="quiz-card completed-card">
                  <div className="quiz-card-left">
                    <div className="quiz-subject-icon" style={{ background: (subj?.color || '#6C63FF') + '22' }}>{subj?.icon}</div>
                    <div>
                      <div className="quiz-card-title">{quiz.title}</div>
                      <div className="quiz-card-meta">
                        <span className="quiz-tag">{quiz.score}% score</span>
                        <span className="quiz-tag">{quiz.correctCount}/{quiz.questions?.length} correct</span>
                      </div>
                    </div>
                  </div>
                  <div className="score-badge-sm" style={{ color: scoreColor(quiz.score) }}>{quiz.score}%</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div>
      <div className="analytics-chart">
        <h3 className="sub-section-title">📊 Performance Over Time</h3>
        {completed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <h3>No Data Yet</h3>
            <p>Complete quizzes to see your analytics!</p>
          </div>
        ) : (
          <div className="perf-bars">
            {completed.slice(-8).map((quiz, i) => {
              const h = Math.max(10, quiz.score);
              return (
                <div key={i} className="perf-bar-wrap">
                  <div className="perf-bar-col">
                    <span className="perf-bar-pct">{quiz.score}%</span>
                    <div className="perf-bar-fill" style={{ height: `${h}%`, background: scoreColor(quiz.score) }} />
                  </div>
                  <span className="perf-bar-label">Q{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="analytic-cards">
        <div className="analytic-card">
          <div className="analytic-val">{subjectAnalytics.correct}</div>
          <div className="analytic-label">Correct Answers</div>
        </div>
        <div className="analytic-card">
          <div className="analytic-val">{subjectAnalytics.answered - subjectAnalytics.correct}</div>
          <div className="analytic-label">Incorrect Answers</div>
        </div>
        <div className="analytic-card">
          <div className="analytic-val">{subjectAnalytics.answered}</div>
          <div className="analytic-label">Total Questions</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      {/* Back + Title */}
      <div className="subj-dash-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="subj-dash-title" style={{ color: subj?.color }}>
          <span className="subj-big-icon">{subj?.icon}</span>
          {subj?.label}
        </div>
      </div>

      {/* Tabs */}
      <div className="subj-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`subj-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview'  && renderOverview()}
      {activeTab === 'Chats'     && renderChats()}
      {activeTab === 'Quizzes'   && renderQuizzes()}
      {activeTab === 'Analytics' && renderAnalytics()}
    </div>
  );
}

function getRecommendedTopics(subjectId) {
  const topics = {
    math:      ['Algebra Fundamentals', 'Quadratic Equations', 'Trigonometry', 'Calculus Basics', 'Statistics & Probability'],
    physics:   ["Newton's Laws", 'Kinematics', 'Work & Energy', 'Waves & Optics', 'Electromagnetism'],
    chemistry: ['Atomic Structure', 'Chemical Bonding', 'Periodic Table', 'Acids & Bases', 'Organic Chemistry'],
    biology:   ['Cell Structure', 'DNA & Genetics', 'Photosynthesis', 'Human Body Systems', 'Evolution'],
    cs:        ['Data Structures', 'Algorithms', 'OOP Concepts', 'Database Design', 'Computer Networks'],
    english:   ['Grammar Rules', 'Essay Writing', 'Reading Comprehension', 'Vocabulary Building', 'Literature Analysis'],
    history:   ['World Wars', 'Ancient Civilizations', 'Industrial Revolution', 'Indian History', 'Modern History'],
    geography: ['Physical Geography', 'Climate Zones', 'Map Skills', 'World Capitals', 'Natural Disasters'],
  };
  return topics[subjectId] || ['Core Concepts', 'Practice Problems', 'Review Topics'];
}
