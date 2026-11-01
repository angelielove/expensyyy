import { format, isValid, parseISO } from "date-fns";

export const MANILA_TIMEZONE = "Asia/Manila";

export function todayISO(): string {
  return new Date().toISOString();
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function monthKeyFromDate(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? currentMonthKey(date) : "";
}

export function monthLabel(monthKey: string, pattern = "MMMM yyyy"): string {
  if (!monthKey) return "—";
  const date = parseISO(`${monthKey}-01`);
  return isValid(date) ? format(date, pattern) : monthKey;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const date = parseISO(`${monthKey}-01`);
  if (!isValid(date)) return currentMonthKey();
  date.setMonth(date.getMonth() + delta);
  return currentMonthKey(date);
}

export function monthRange(monthKey: string): { start: Date; end: Date } {
  const start = parseISO(`${monthKey}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function lastNMonths(monthKey: string, count: number): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(shiftMonth(monthKey, -i));
  }
  return months;
}

export function formatDate(value: string | null | undefined, pattern = "MMM d, yyyy"): string {
  if (!value) return "—";
  const date = value.length <= 10 ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, pattern) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "MMM d, yyyy • h:mm a");
}

export function todayDateInput(): string {
  return toISODate(new Date());
}

export function daysUntil(dueDate: string, reference = new Date()): number {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const due = parseISO(dueDate);
  if (!isValid(due)) return Number.POSITIVE_INFINITY;
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isPastDate(date: string): boolean {
  return daysUntil(date) < 0;
}

export function yearFromMonth(monthKey: string): number {
  return Number(monthKey.slice(0, 4)) || new Date().getFullYear();
}
