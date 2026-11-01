import { currentMonthKey } from "@/lib/dates";
import type { UserProfile } from "@/types";

export const DEFAULT_MEMBER_NAMES = ["Bebe", "Mama", "Tine"];
export const HOA_MONTHLY_DUE = 200;

export function createDefaultProfile(uid: string, email: string, displayName: string): UserProfile {
  return {
    uid,
    email,
    displayName: displayName || email.split("@")[0] || "Friend",
    photoURL: "",
    currency: "PHP",
    dateFormat: "MMM d, yyyy",
    theme: "light",
    householdName: "My Household",
    members: DEFAULT_MEMBER_NAMES.map((name, index) => ({
      id: `member-${index + 1}`,
      name,
      contribution: 0,
    })),
    waterMinimumCharge: 345,
    waterMinimumConsumption: 10,
    waterExcessRate: 0,
    electricityRate: 12.5,
    defaultMonthView: currentMonthKey(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const CURRENCY_OPTIONS = [
  { value: "PHP", label: "Philippine Peso (₱)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "SGD", label: "Singapore Dollar (S$)" },
  { value: "AED", label: "UAE Dirham (AED)" },
] as const;

export const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "Aug 24, 2026" },
  { value: "MMM d", label: "Aug 24" },
  { value: "yyyy-MM-dd", label: "2026-08-24" },
  { value: "d MMMM yyyy", label: "24 August 2026" },
  { value: "MM/dd/yyyy", label: "08/24/2026" },
  { value: "dd/MM/yyyy", label: "24/08/2026" },
] as const;
