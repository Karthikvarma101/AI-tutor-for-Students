import React from 'react';

const TABS = [
  { id: 'home',    label: 'Home',    icon: '🏠' },
  { id: 'tutor',   label: 'AI Tutor', icon: '🤖' },
  { id: 'quizzes', label: 'Quizzes', icon: '📝' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          id={`nav-${tab.id}`}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
          {activeTab === tab.id && <span className="nav-dot" />}
        </button>
      ))}
    </nav>
  );
}
