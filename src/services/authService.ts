"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isDemoMode } from "@/lib/firebase";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isDemo: boolean;
}

interface DemoAccount {
  uid: string;
  email: string;
  name: string;
  password: string;
}

const ACCOUNTS_KEY = "expensyyy:demo:accounts";
const SESSION_KEY = "expensyyy:demo:session";

function mapFirebaseUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName || user.email?.split("@")[0] || "Friend",
    photoURL: user.photoURL ?? "",
    isDemo: false,
  };
}

function demoUid(email: string): string {
  let hash = 0;
  const normalized = email.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `demo-${Math.abs(hash).toString(36)}-${normalized.length}`;
}

function readAccounts(): DemoAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as DemoAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: DemoAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readSession(): AppUser | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as AppUser | null;
  } catch {
    return null;
  }
}

function writeSession(user: AppUser | null): void {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

export function subscribeToAuth(callback: (user: AppUser | null) => void): () => void {
  if (isDemoMode) {
    callback(readSession());
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    callback(user ? mapFirebaseUser(user) : null);
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (isDemoMode) {
    const accounts = readAccounts();
    if (accounts.some((account) => account.email === cleanEmail)) {
      throw new Error("That email is already registered. Try logging in instead.");
    }
    const account: DemoAccount = {
      uid: demoUid(cleanEmail),
      email: cleanEmail,
      name: cleanName || cleanEmail.split("@")[0],
      password,
    };
    writeAccounts([...accounts, account]);
    const user: AppUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.name,
      isDemo: true,
    };
    writeSession(user);
    return user;
  }

  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    cleanEmail,
    password,
  );
  if (cleanName) {
    await updateProfile(credential.user, { displayName: cleanName });
  }
  return {
    ...mapFirebaseUser(credential.user),
    displayName: cleanName || credential.user.email?.split("@")[0] || "Friend",
  };
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();

  if (isDemoMode) {
    const account = readAccounts().find((entry) => entry.email === cleanEmail);
    if (!account) throw new Error("No account found with that email. Create one first.");
    if (account.password !== password) throw new Error("Incorrect password. Please try again.");
    const user: AppUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.name,
      isDemo: true,
    };
    writeSession(user);
    return user;
  }

  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), cleanEmail, password);
  return mapFirebaseUser(credential.user);
}

export async function loginWithGoogle(): Promise<AppUser> {
  if (isDemoMode) {
    throw new Error("Google sign-in is available when Firebase is configured.");
  }
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  return mapFirebaseUser(credential.user);
}

export async function logoutUser(): Promise<void> {
  if (isDemoMode) {
    writeSession(null);
    return;
  }
  await signOut(getFirebaseAuth());
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (isDemoMode) {
    throw new Error(
      "Password reset needs Firebase. In demo mode, data lives only in this browser.",
    );
  }
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

export async function updateUserDisplayName(name: string): Promise<void> {
  if (isDemoMode) {
    const session = readSession();
    if (!session) return;
    const accounts = readAccounts().map((account) =>
      account.uid === session.uid ? { ...account, name } : account,
    );
    writeAccounts(accounts);
    writeSession({ ...session, displayName: name });
    return;
  }
  const user = getFirebaseAuth().currentUser;
  if (user) await updateProfile(user, { displayName: name });
}
