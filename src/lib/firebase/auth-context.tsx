"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  /** True until the first `onAuthStateChanged` callback has fired. */
  initializing: boolean;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  /**
   * Phone sign-in step 1 — sends an SMS code to a number in E.164 format
   * via an invisible reCAPTCHA bound to `recaptchaContainerId`. Returns a
   * `ConfirmationResult` whose `confirm(code)` call finishes the sign-in.
   */
  startPhoneSignIn: (
    phoneNumber: string,
    recaptchaContainerId: string,
  ) => Promise<ConfirmationResult>;
  signOut: () => Promise<void>;
  /** Resolves the current Firebase ID token, refreshing on demand. */
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Subscribe to auth state, persisting in localStorage so reloads stay logged in.
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setInitializing(false);
      return;
    }
    const auth = getFirebaseAuth();
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Failed to set auth persistence:", err);
    });
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  // Provision `users/{uid}` on every sign-in. Idempotent — POST /api/users uses
  // `{ merge: true }` under the hood, so OAuth profile updates flow through.
  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email:
              user.email ??
              (user.phoneNumber ? `${user.phoneNumber}@phone.local` : ""),
            name:
              user.displayName ?? user.email ?? user.phoneNumber ?? "User",
            avatar_url: user.photoURL ?? null,
          }),
          signal: ctrl.signal,
        }),
      )
      .catch((err) => {
        if ((err as { name?: string }).name !== "AbortError") {
          console.warn("Failed to upsert users/{uid}:", err);
        }
      });
    return () => ctrl.abort();
  }, [user]);

  const wrap = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      wrap(async () => {
        const cred = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
        return cred.user;
      }),
    [wrap],
  );

  const signUpWithEmail = useCallback(
    ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name?: string;
    }) =>
      wrap(async () => {
        const cred = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
        if (name?.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        return cred.user;
      }),
    [wrap],
  );

  const signInWithGoogle = useCallback(
    () =>
      wrap(async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const cred = await signInWithPopup(getFirebaseAuth(), provider);
        return cred.user;
      }),
    [wrap],
  );

  const startPhoneSignIn = useCallback(
    (phoneNumber: string, recaptchaContainerId: string) =>
      wrap(async () => {
        const auth = getFirebaseAuth();
        // Reuse one verifier per provider — Firebase throws if you bind two
        // verifiers to the same container.
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(
            auth,
            recaptchaContainerId,
            { size: "invisible" },
          );
        }
        return await signInWithPhoneNumber(
          auth,
          phoneNumber,
          recaptchaRef.current,
        );
      }),
    [wrap],
  );

  const signOutFn = useCallback(async () => {
    await wrap(async () => {
      await signOut(getFirebaseAuth());
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          /* no-op */
        }
        recaptchaRef.current = null;
      }
    });
  }, [wrap]);

  const getIdToken = useCallback(
    async (forceRefresh = false) => {
      if (!user) return null;
      try {
        return await user.getIdToken(forceRefresh);
      } catch (err) {
        console.warn("Failed to fetch ID token:", err);
        return null;
      }
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      initializing,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      startPhoneSignIn,
      signOut: signOutFn,
      getIdToken,
    }),
    [
      user,
      loading,
      initializing,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      startPhoneSignIn,
      signOutFn,
      getIdToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

/**
 * Static helper for grabbing the current Firebase ID token outside React
 * (used by `apiFetch`). Returns `null` when no one is logged in, the page
 * is rendering on the server, or Firebase isn't configured.
 */
export async function getCurrentIdToken(
  forceRefresh = false,
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  try {
    const u = getFirebaseAuth().currentUser;
    if (!u) return null;
    return await u.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}
