import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storage, KEYS } from '../utils/storage';
import { DAILY_QUIZ_BANK } from '../data/subjects';

const AppDataContext = createContext(null);

function getLocalQuizzes(userId) {
  const all = storage.get(KEYS.QUIZZES) || [];
  return all.filter(q => q.userId === userId);
}
function setLocalQuizzes(userId, quizzes) {
  const all = storage.get(KEYS.QUIZZES) || [];
  const others = all.filter(q => q.userId !== userId);
  storage.set(KEYS.QUIZZES, [...others, ...quizzes]);
}
function getLocalChats(userId, subject) {
  const all = storage.get(KEYS.CHATS) || {};
  const user = all[userId] || {};
  return subject ? (user[subject] || []) : user;
}
function setLocalChats(userId, subject, msgs) {
  const all = storage.get(KEYS.CHATS) || {};
  if (!all[userId]) all[userId] = {};
  all[userId][subject] = msgs;
  storage.set(KEYS.CHATS, all);
}
async function tryFs(fn) {
  try { return await fn(); }
  catch (e) { console.warn('[Firestore] skipped:', e.message?.slice(0, 80)); return null; }
}

export function AppDataProvider({ children }) {
  const { currentUser, useFirebase } = useAuth();
  const [quizzes,     setQuizzes]     = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [chats,       setChats]       = useState({});

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoadingData(true);
    try {
      const localQ = getLocalQuizzes(currentUser.id);
      setQuizzes(localQ);
      setAnalytics(storage.get(KEYS.ANALYTICS));

      if (useFirebase) {
        // Sync quizzes
        const fsQ = await tryFs(async () => {
          const { getUserQuizzesFromFirestore } = await import('../services/firestoreService');
          return getUserQuizzesFromFirestore(currentUser.id);
        });
        if (fsQ?.length > 0) {
          const fsIds = new Set(fsQ.map(q => q.id));
          const merged = [...fsQ, ...localQ.filter(q => !fsIds.has(q.id))];
          setQuizzes(merged);
          setLocalQuizzes(currentUser.id, merged);
        }
        // Sync analytics
        const fsA = await tryFs(async () => {
          const { getAnalyticsFromFirestore } = await import('../services/firestoreService');
          return getAnalyticsFromFirestore(currentUser.id);
        });
        if (fsA) setAnalytics(fsA);
      }
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, useFirebase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── CHATS ──────────────────────────────────────────────────────
  const saveChat = useCallback(async (userId, subject, messages) => {
    if (!messages?.length) return;
    const lastMsg = messages[messages.length - 1];
    const existing = getLocalChats(userId, subject);
    const updated = [...existing, lastMsg];
    setLocalChats(userId, subject, updated);
    setChats(prev => ({ ...prev, [subject]: updated }));
    if (useFirebase) {
      tryFs(async () => {
        const { saveChatMessage } = await import('../services/firestoreService');
        await saveChatMessage(userId, subject, { role: lastMsg.role, content: lastMsg.content });
      });
    }
  }, [useFirebase]);

  const getChatsForUser = useCallback(async (userId, subject) => {
    if (useFirebase) {
      const result = await tryFs(async () => {
        const { getChatMessages } = await import('../services/firestoreService');
        return getChatMessages(userId, subject);
      });
      if (result?.length > 0) { setLocalChats(userId, subject, result); return result; }
    }
    return getLocalChats(userId, subject);
  }, [useFirebase]);

  // ── QUIZZES ────────────────────────────────────────────────────
  const addQuiz = useCallback(async (quiz) => {
    const localQ = getLocalQuizzes(currentUser.id);
    const updated = [quiz, ...localQ.filter(q => q.id !== quiz.id)];
    setLocalQuizzes(currentUser.id, updated);
    setQuizzes(updated);
    if (useFirebase) {
      tryFs(async () => {
        const { saveQuiz } = await import('../services/firestoreService');
        await saveQuiz(currentUser.id, quiz);
      });
    }
  }, [currentUser, useFirebase]);

  const completeQuiz = useCallback(async (quizId, answers, questions) => {
    let correct = 0;
    const answersArray = questions.map((_, i) => answers[i] ?? -1);
    answersArray.forEach((ans, i) => { if (ans === questions[i].correct) correct++; });

    const updates = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      score: Math.round((correct / questions.length) * 100),
      userAnswers: answersArray,
      correctCount: correct,
    };

    const localQ = getLocalQuizzes(currentUser.id);
    const updated = localQ.map(q => q.id === quizId ? { ...q, ...updates } : q);
    setLocalQuizzes(currentUser.id, updated);
    setQuizzes(updated);

    // Update analytics
    const quizObj = localQ.find(q => q.id === quizId);
    if (quizObj) {
      const existing = storage.get(KEYS.ANALYTICS) || { subjects: {}, totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0 };
      const sub = existing.subjects?.[quizObj.subject] || { quizzes: 0, correct: 0, answered: 0 };
      const updatedAnalytics = {
        ...existing,
        subjects: {
          ...existing.subjects,
          [quizObj.subject]: {
            quizzes:  sub.quizzes  + 1,
            correct:  sub.correct  + correct,
            answered: sub.answered + questions.length,
          },
        },
        totalQuizzes:  (existing.totalQuizzes  || 0) + 1,
        totalCorrect:  (existing.totalCorrect  || 0) + correct,
        totalAnswered: (existing.totalAnswered || 0) + questions.length,
      };
      storage.set(KEYS.ANALYTICS, updatedAnalytics);
      setAnalytics(updatedAnalytics);
    }

    if (useFirebase && quizObj) {
      tryFs(async () => {
        const { updateQuiz, updateAnalyticsInFirestore } = await import('../services/firestoreService');
        await Promise.all([
          updateQuiz(currentUser.id, quizId, updates),
          updateAnalyticsInFirestore(currentUser.id, quizObj.subject, correct, questions.length),
        ]);
      });
    }
    return { ...updates, questions };
  }, [currentUser, useFirebase]);

  // Generate daily quizzes for user subjects (5 per subject)
  const getDailyQuizzes = useCallback(() => {
    const subjects = currentUser?.subjects || ['math', 'physics', 'chemistry'];
    return subjects.map(subjId => {
      const bank = DAILY_QUIZ_BANK[subjId] || [];
      const shuffled = [...bank].sort(() => Math.random() - 0.5).slice(0, 5);
      return {
        id: `daily_${subjId}_${new Date().toDateString().replace(/\s/g, '_')}`,
        title: `Daily ${subjId.charAt(0).toUpperCase() + subjId.slice(1)} Quiz`,
        subject: subjId,
        questions: shuffled,
        status: 'daily',
        createdAt: new Date().toISOString(),
        source: 'daily',
      };
    });
  }, [currentUser]);

  const refreshQuizzes = useCallback(() => {
    if (!currentUser) return;
    setQuizzes(getLocalQuizzes(currentUser.id));
  }, [currentUser]);

  return (
    <AppDataContext.Provider value={{
      chats, quizzes, analytics, loadingData,
      saveChat, getChatsForUser,
      addQuiz, completeQuiz, refreshQuizzes,
      getDailyQuizzes, loadData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() { return useContext(AppDataContext); }
