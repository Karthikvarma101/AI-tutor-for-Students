import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import HomePage from '../pages/HomePage';
import AITutorPage from '../pages/AITutorPage';
import QuizPage from '../pages/QuizPage';

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  const [activeTab,     setActiveTab]     = useState('home');
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try { await logout(); } finally { setLogoutLoading(false); }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':    return <HomePage />;
      case 'tutor':   return <AITutorPage />;
      case 'quizzes': return <QuizPage />;
      default:        return <HomePage />;
    }
  };

  const tabAccent = { home: '#F97316', tutor: '#8B5CF6', quizzes: '#10B981' };

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-logo">
          <span className="top-bar-emoji">🎓</span>
          EduBot AI
        </div>
        <div className="top-bar-right">
          <div className="user-pill">
            <div className="user-avatar">{currentUser?.name?.[0]?.toUpperCase() || 'S'}</div>
            <span className="user-name">{currentUser?.name?.split(' ')[0] || 'Student'}</span>
          </div>
          <button
            id="logout-btn"
            className="logout-btn"
            onClick={handleLogout}
            disabled={logoutLoading}
            title="Logout"
          >
            {logoutLoading ? <span className="spinner-sm" /> : '⏻'}
          </button>
        </div>
      </header>

      {/* Active tab accent bar */}
      <div className="tab-accent-bar" style={{ background: tabAccent[activeTab] }} />

      {/* Main Content */}
      <main className="app-content">
        {renderTab()}
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
