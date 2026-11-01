"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerUser,
  requestPasswordReset,
  subscribeToAuth,
  updateUserDisplayName,
  type AppUser,
} from "@/services/authService";
import { isDemoMode } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/validation";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  demoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code ?? "");
    if (code) return friendlyAuthError(code);
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    const timeout = window.setTimeout(() => setLoading(false), 4000);
    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const signedIn = await loginUser(email, password);
    setUser(signedIn);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const created = await registerUser(name, email, password);
    setUser(created);
  }, []);

  const loginGoogle = useCallback(async () => {
    const signedIn = await loginWithGoogle();
    setUser(signedIn);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await requestPasswordReset(email);
  }, []);

  const setDisplayName = useCallback(
    async (name: string) => {
      await updateUserDisplayName(name);
      setUser((current) => (current ? { ...current, displayName: name } : current));
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      demoMode: isDemoMode,
      login,
      register,
      loginGoogle,
      logout,
      resetPassword,
      setDisplayName,
    }),
    [user, loading, login, register, loginGoogle, logout, resetPassword, setDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
