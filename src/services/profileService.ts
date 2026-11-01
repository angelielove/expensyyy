"use client";

import { createDefaultProfile } from "@/lib/defaults";
import { readProfileDoc, writeProfileDoc, nowISO } from "@/lib/store";
import type { UserProfile } from "@/types";
import type { AppUser } from "@/services/authService";

export async function getOrCreateProfile(user: AppUser): Promise<UserProfile> {
  const fallback = createDefaultProfile(user.uid, user.email, user.displayName);
  const stored = await readProfileDoc<Partial<UserProfile>>(user.uid);
  if (!stored) {
    await writeProfileDoc(user.uid, fallback as unknown as Record<string, unknown>);
    return fallback;
  }
  const merged: UserProfile = {
    ...fallback,
    ...stored,
    uid: user.uid,
    email: stored.email || user.email,
    displayName: stored.displayName || user.displayName,
    members:
      Array.isArray(stored.members) && stored.members.length > 0
        ? stored.members
        : fallback.members,
    theme: stored.theme === "dark" ? "dark" : "light",
  };
  return merged;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const next: UserProfile = { ...profile, updatedAt: nowISO() };
  await writeProfileDoc(next.uid, next as unknown as Record<string, unknown>);
  return next;
}
