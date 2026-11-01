export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= 6;
}

export function required(value: string | number | null | undefined): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(value && String(value).trim());
}

export function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function fileIsAllowed(file: File): { ok: boolean; message?: string } {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return { ok: false, message: "Please upload a JPG, PNG, WEBP, GIF, or PDF file." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "File is too large. Maximum size is 5 MB." };
  }
  return { ok: true };
}

export function friendlyAuthError(code: string): string {
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase.",
  };
  return messages[code] ?? "Something went wrong. Please try again.";
}
