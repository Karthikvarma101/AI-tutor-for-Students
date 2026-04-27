import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AppLayout from './layout/AppLayout';
import './index.css';

function AppRouter() {
  const { currentUser, loading } = useAuth();
  const [authView, setAuthView] = useState('login');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">🎓</div>
        <div className="spinner-lg" />
        <p className="loading-text">Loading EduBot AI...</p>
      </div>
    );
  }

  if (!currentUser) {
    return authView === 'login'
      ? <LoginPage onNavigateSignup={() => setAuthView('signup')} />
      : <SignupPage onNavigateLogin={() => setAuthView('login')} />;
  }

  // No assessment — go straight to the app
  return (
    <AppDataProvider>
      <AppLayout />
    </AppDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
