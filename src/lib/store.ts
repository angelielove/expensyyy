"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb, isDemoMode } from "@/lib/firebase";

export type CollectionName =
  | "groceries"
  | "groceryPriceHistory"
  | "shoppingLists"
  | "bills"
  | "rentPayments";

const DEMO_PREFIX = "expensyyy";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function storageKey(uid: string, name: string): string {
  return `${DEMO_PREFIX}:data:${uid}:${name}`;
}

function profileKey(uid: string): string {
  return `${DEMO_PREFIX}:profile:${uid}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Browser storage is full. Remove a few receipts or export your data before adding more.",
    );
  }
}

function clean<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => clean(entry)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (entry !== undefined) output[key] = clean(entry);
    });
    return output as T;
  }
  return value;
}

export async function listRecords<T>(uid: string, name: CollectionName): Promise<T[]> {
  if (isDemoMode) {
    return readJSON<T[]>(storageKey(uid, name), []);
  }
  const snapshot = await getDocs(collection(getDb(), "users", uid, name));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as T);
}

export async function createRecord<T extends object>(
  uid: string,
  name: CollectionName,
  data: T,
): Promise<T & { id: string }> {
  const id = newId();
  const payload = clean({ ...data, userId: uid, id });
  if (isDemoMode) {
    const key = storageKey(uid, name);
    const records = readJSON<Array<Record<string, unknown>>>(key, []);
    writeJSON(key, [payload, ...records]);
    return payload as T & { id: string };
  }
  const rest = { ...(payload as Record<string, unknown>) };
  delete rest.id;
  await setDoc(doc(getDb(), "users", uid, name, id), rest);
  return payload as T & { id: string };
}

export async function updateRecord<T extends { id: string }>(
  uid: string,
  name: CollectionName,
  id: string,
  patch: Partial<T>,
): Promise<void> {
  const payload = clean({ ...patch, updatedAt: nowISO() });
  if (isDemoMode) {
    const key = storageKey(uid, name);
    const records = readJSON<Array<Record<string, unknown>>>(key, []);
    const next = records.map((record) =>
      record.id === id ? { ...record, ...payload } : record,
    );
    writeJSON(key, next);
    return;
  }
  const rest = { ...(payload as Record<string, unknown>) };
  delete rest.id;
  await updateDoc(doc(getDb(), "users", uid, name, id), rest);
}

export async function deleteRecord(
  uid: string,
  name: CollectionName,
  id: string,
): Promise<void> {
  if (isDemoMode) {
    const key = storageKey(uid, name);
    const records = readJSON<Array<Record<string, unknown>>>(key, []);
    writeJSON(
      key,
      records.filter((record) => record.id !== id),
    );
    return;
  }
  await deleteDoc(doc(getDb(), "users", uid, name, id));
}

export async function readProfileDoc<T>(uid: string): Promise<T | null> {
  if (isDemoMode) {
    return readJSON<T | null>(profileKey(uid), null);
  }
  const snapshot = await getDoc(doc(getDb(), "users", uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as T;
}

export async function writeProfileDoc<T extends Record<string, unknown>>(
  uid: string,
  profile: T,
): Promise<void> {
  if (isDemoMode) {
    writeJSON(profileKey(uid), profile);
    return;
  }
  const { ...rest } = profile;
  await setDoc(doc(getDb(), "users", uid), rest, { merge: true });
}

export function clearDemoData(uid: string): void {
  if (typeof window === "undefined") return;
  const collections: CollectionName[] = [
    "groceries",
    "groceryPriceHistory",
    "shoppingLists",
    "bills",
    "rentPayments",
  ];
  collections.forEach((name) => window.localStorage.removeItem(storageKey(uid, name)));
}

export function localDataSize(uid: string): number {
  if (typeof window === "undefined") return 0;
  const collections: CollectionName[] = [
    "groceries",
    "groceryPriceHistory",
    "shoppingLists",
    "bills",
    "rentPayments",
  ];
  return collections.reduce((total, name) => {
    const raw = window.localStorage.getItem(storageKey(uid, name)) ?? "";
    return total + raw.length;
  }, 0);
}
