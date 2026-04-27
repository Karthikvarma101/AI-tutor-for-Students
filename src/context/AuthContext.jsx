import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, KEYS } from '../utils/storage';

const AuthContext = createContext(null);

const apiKey   = import.meta.env.VITE_FIREBASE_API_KEY   || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const USE_FIREBASE =
  apiKey.length > 20 &&
  !apiKey.startsWith('your_') &&
  !!projectId &&
  !projectId.startsWith('your_');

// ── localStorage helpers ─────────────────────────────────────────
const localLogin = (email, password) => {
  const users = storage.get(KEYS.USERS) || [];
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');
  storage.set(KEYS.CURRENT_USER, user);
  return user;
};

const localSignup = (userData) => {
  const users = storage.get(KEYS.USERS) || [];
  if (users.find(u => u.email === userData.email)) {
    throw new Error('An account with this email already exists');
  }
  const newUser = {
    ...userData,
    id: `user_${Date.now()}`,
    createdAt: new Date().toISOString(),
    level: 'beginner',
  };
  users.push(newUser);
  storage.set(KEYS.USERS, users);
  storage.set(KEYS.CURRENT_USER, newUser);
  return newUser;
};

const localUpdateUser = (currentUser, updates) => {
  const users = storage.get(KEYS.USERS) || [];
  const idx = users.findIndex(u => u.id === currentUser.id);
  const updated = { ...currentUser, ...updates };
  if (idx !== -1) { users[idx] = updated; storage.set(KEYS.USERS, users); }
  storage.set(KEYS.CURRENT_USER, updated);
  return updated;
};

// ── Provider ─────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!USE_FIREBASE) {
      const saved = storage.get(KEYS.CURRENT_USER);
      if (saved) setCurrentUser(saved);
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};
    (async () => {
      try {
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const { getUserProfile } = await import('../services/firestoreService');

        const config = {
          apiKey,
          authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId,
          storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId:             import.meta.env.VITE_FIREBASE_APP_ID,
        };
        const app  = getApps().length === 0 ? initializeApp(config) : getApp();
        const auth = getAuth(app);

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            try {
              const profile = await getUserProfile(fbUser.uid);
              setCurrentUser(profile
                ? { ...profile, fbUser }
                : { id: fbUser.uid, email: fbUser.email, name: fbUser.displayName || 'Student', level: 'beginner', fbUser });
            } catch {
              setCurrentUser({ id: fbUser.uid, email: fbUser.email, name: fbUser.displayName || 'Student', level: 'beginner', fbUser });
            }
          } else {
            setCurrentUser(null);
          }
          setLoading(false);
        });
      } catch (err) {
        console.warn('Firebase auth failed, falling back to localStorage:', err.message);
        const saved = storage.get(KEYS.CURRENT_USER);
        if (saved) setCurrentUser(saved);
        setLoading(false);
      }
    })();

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!USE_FIREBASE) return localLogin(email, password);
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getApp } = await import('firebase/app');
      await signInWithEmailAndPassword(getAuth(getApp()), email, password);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/configuration-not-found' || code === 'auth/internal-error') {
        return localLogin(email, password);
      }
      throw new Error(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'Invalid email or password' :
        code === 'auth/user-not-found'     ? 'No account with this email' :
        code === 'auth/too-many-requests'  ? 'Too many attempts. Please wait.' :
        err.message
      );
    }
  };

  const signup = async (userData) => {
    if (!USE_FIREBASE) {
      const user = localSignup(userData);
      setCurrentUser(user);
      return user;
    }
    try {
      const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { getApp } = await import('firebase/app');
      const { saveUserProfile } = await import('../services/firestoreService');
      const cred = await createUserWithEmailAndPassword(getAuth(getApp()), userData.email, userData.password);
      await updateProfile(cred.user, { displayName: userData.name });
      const profile = {
        id: cred.user.uid, name: userData.name, email: userData.email,
        dob: userData.dob, age: userData.age, classYear: userData.classYear,
        college: userData.college, subjects: userData.subjects,
        level: 'beginner', createdAt: new Date().toISOString(),
      };
      await saveUserProfile(cred.user.uid, profile);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/configuration-not-found' || code === 'auth/internal-error') {
        const user = localSignup(userData);
        setCurrentUser(user);
        return user;
      }
      throw new Error(
        code === 'auth/email-already-in-use' ? 'An account with this email already exists' :
        code === 'auth/weak-password'         ? 'Password must be at least 6 characters' :
        err.message
      );
    }
  };

  const updateUser = async (updates) => {
    if (!USE_FIREBASE) {
      const updated = localUpdateUser(currentUser, updates);
      setCurrentUser(updated);
      return;
    }
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    try {
      const { updateUserProfile } = await import('../services/firestoreService');
      await updateUserProfile(currentUser.id, updates);
    } catch (err) {
      console.warn('Firestore updateUser:', err.message);
    }
  };

  const logout = async () => {
    if (!USE_FIREBASE) {
      storage.remove(KEYS.CURRENT_USER);
      setCurrentUser(null);
      return;
    }
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const { getApp } = await import('firebase/app');
      await signOut(getAuth(getApp()));
    } catch {
      storage.remove(KEYS.CURRENT_USER);
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, signup, logout, updateUser, useFirebase: USE_FIREBASE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
