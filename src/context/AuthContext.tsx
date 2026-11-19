'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  getFirebaseAuth,
  googleProvider,
  getTurkishAuthError,
} from '@/lib/firebase/client';
import { syncUserProfileDoc } from '@/lib/firestore-service';
import { DEFAULT_AVATAR, normalizeAvatarUrl } from '@/lib/security';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    username: string;
    photoURL: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateUserProfile: (username: string, photoURL: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Kimlik doğrulama servisi yapılandırılmamış.');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const name = cred.user.displayName || email.split('@')[0] || 'Sinemasever';
      const photo = normalizeAvatarUrl(cred.user.photoURL);
      await syncUserProfileDoc({
        uid: cred.user.uid,
        email: cred.user.email || email,
        username: name,
        photoURL: photo,
      }).catch(() => {});
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      throw new Error(getTurkishAuthError(code));
    }
  }, []);

  const registerWithEmail = useCallback(
    async (params: {
      email: string;
      password: string;
      username: string;
      photoURL: string;
    }) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Kimlik doğrulama servisi yapılandırılmamış.');

      const cleanUsername = params.username.trim();
      if (cleanUsername.length < 2 || cleanUsername.length > 40) {
        throw new Error('Kullanıcı adı 2 ile 40 karakter arasında olmalıdır.');
      }
      if (params.password.length < 8) {
        throw new Error('Şifreniz en az 8 karakter uzunluğunda olmalıdır.');
      }

      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          params.email.trim(),
          params.password
        );
        const safeAvatar = normalizeAvatarUrl(params.photoURL || DEFAULT_AVATAR);
        await updateProfile(cred.user, {
          displayName: cleanUsername,
          photoURL: safeAvatar,
        });
        await syncUserProfileDoc({
          uid: cred.user.uid,
          email: cred.user.email || params.email.trim(),
          username: cleanUsername,
          photoURL: safeAvatar,
        }).catch(() => {});

        await sendEmailVerification(cred.user).catch(() => {});
        setUser({ ...cred.user });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        throw new Error(getTurkishAuthError(code));
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Kimlik doğrulama servisi yapılandırılmamış.');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const name = cred.user.displayName || cred.user.email?.split('@')[0] || 'Sinemasever';
      const photo = normalizeAvatarUrl(cred.user.photoURL);
      await syncUserProfileDoc({
        uid: cred.user.uid,
        email: cred.user.email || '',
        username: name,
        photoURL: photo,
      }).catch(() => {});
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      throw new Error(getTurkishAuthError(code));
    }
  }, []);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Kimlik doğrulama servisi yapılandırılmamış.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      throw new Error(getTurkishAuthError(code));
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) throw new Error('Önce giriş yapmalısınız.');
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      throw new Error(getTurkishAuthError(code));
    }
  }, []);

  const updateUserProfile = useCallback(async (username: string, photoURL: string) => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) throw new Error('Önce giriş yapmalısınız.');
    const cleanName = username.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      throw new Error('Kullanıcı adı 2 ile 40 karakter arasında olmalıdır.');
    }
    const safeAvatar = normalizeAvatarUrl(photoURL);
    await updateProfile(auth.currentUser, {
      displayName: cleanName,
      photoURL: safeAvatar,
    });
    await syncUserProfileDoc({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || '',
      username: cleanName,
      photoURL: safeAvatar,
    });
    setUser({ ...auth.currentUser });
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const displayName = user
    ? user.displayName || user.email?.split('@')[0] || 'Sinemasever'
    : 'Misafir';

  const avatarUrl = user ? normalizeAvatarUrl(user.photoURL) : DEFAULT_AVATAR;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        displayName,
        avatarUrl,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        updateUserProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}
