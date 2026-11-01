"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage, isDemoMode } from "@/lib/firebase";
import { fileIsAllowed } from "@/lib/validation";
import { newId } from "@/lib/store";
import type { ReceiptUpload } from "@/types";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file. Please try again."));
    reader.readAsDataURL(file);
  });
}

export async function uploadReceipt(userId: string, file: File): Promise<ReceiptUpload> {
  const check = fileIsAllowed(file);
  if (!check.ok) throw new Error(check.message);

  if (isDemoMode) {
    const url = await readAsDataUrl(file);
    return { url, name: file.name };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `receipts/${userId}/${newId()}-${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { url, name: file.name };
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const check = fileIsAllowed(file);
  if (!check.ok) throw new Error(check.message);
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file for your profile picture.");
  }
  if (isDemoMode) return readAsDataUrl(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageRef = ref(getFirebaseStorage(), `avatars/${userId}/${newId()}-${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
