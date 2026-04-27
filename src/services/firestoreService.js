// Firestore service — all operations are best-effort and silent on failure

async function getFirestore() {
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getFirestore(app);
}

export async function getUserProfile(uid) {
  const { doc, getDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserProfile(uid, profile) {
  const { doc, setDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  await setDoc(doc(db, 'users', uid), profile, { merge: true });
}

export async function updateUserProfile(uid, updates) {
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  const db = await getFirestore();
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
}

export async function saveQuiz(userId, quiz) {
  const { doc, setDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  await setDoc(doc(db, 'users', userId, 'quizzes', quiz.id), quiz);
}

export async function getUserQuizzesFromFirestore(userId) {
  const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
  const db = await getFirestore();
  const q = query(collection(db, 'users', userId, 'quizzes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function updateQuiz(userId, quizId, updates) {
  const { doc, updateDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  await updateDoc(doc(db, 'users', userId, 'quizzes', quizId), updates);
}

export async function saveChatMessage(userId, subject, msg) {
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const db = await getFirestore();
  await addDoc(collection(db, 'users', userId, 'chats', subject, 'messages'), {
    ...msg, timestamp: serverTimestamp(),
  });
}

export async function getChatMessages(userId, subject) {
  const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
  const db = await getFirestore();
  const q = query(collection(db, 'users', userId, 'chats', subject, 'messages'), orderBy('timestamp', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAnalyticsFromFirestore(userId) {
  const { doc, getDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  const snap = await getDoc(doc(db, 'users', userId, 'analytics', 'summary'));
  return snap.exists() ? snap.data() : null;
}

export async function updateAnalyticsInFirestore(userId, subject, correct, total) {
  const { doc, setDoc, increment } = await import('firebase/firestore');
  const db = await getFirestore();
  const ref = doc(db, 'users', userId, 'analytics', 'summary');
  await setDoc(ref, {
    [`subjects.${subject}.quizzes`]: increment(1),
    [`subjects.${subject}.correct`]: increment(correct),
    [`subjects.${subject}.answered`]: increment(total),
    totalQuizzes: increment(1),
    totalCorrect: increment(correct),
    totalAnswered: increment(total),
  }, { merge: true });
}
