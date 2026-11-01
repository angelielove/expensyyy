export function round2(value: number): number {
  const n = Number.isFinite(value) ? value : 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED",
};

export function currencySymbol(currency = "PHP"): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatCurrency(value: number, currency = "PHP"): string {
  const safe = round2(Number.isFinite(value) ? value : 0);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `₱${safe.toFixed(2)}`;
  }
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number, currency = "PHP"): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.abs(safe) >= 1_000_000) return `₱${(safe / 1_000_000).toFixed(2)}M`;
  if (Math.abs(safe) >= 1_000) return `₱${(safe / 1_000).toFixed(1)}k`;
  return formatCurrency(safe, currency);
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
