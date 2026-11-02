"use client";

import { fileIsAllowed } from "@/lib/validation";
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

  const url = await readAsDataUrl(file);
  return { url, name: file.name };
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const check = fileIsAllowed(file);
  if (!check.ok) throw new Error(check.message);
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file for your profile picture.");
  }
  // Store avatar as a data URL to avoid Storage CORS/permission issues.
  return readAsDataUrl(file);
}
