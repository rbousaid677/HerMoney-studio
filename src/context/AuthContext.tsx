import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const BOOTSTRAP_ADMIN_EMAIL = 'rbousaid677@gmail.com';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminCheckPending: boolean;
  signInEmailPassword: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckPending, setAdminCheckPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setAdminCheckPending(true);
      try {
        if (!nextUser.emailVerified) {
          setIsAdmin(false);
        } else if (nextUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
        } else {
          const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid));
          setIsAdmin(adminDoc.exists());
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminCheckPending(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function signInEmailPassword(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signInGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async function sendVerification(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No signed-in user to verify.');
    }
    await sendEmailVerification(auth.currentUser);
  }

  async function sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        adminCheckPending,
        signInEmailPassword,
        signInGoogle,
        signOut,
        sendVerification,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
