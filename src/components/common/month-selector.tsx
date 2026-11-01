"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/cn";

interface MonthSelectorProps {
  value: string;
  onChange: (monthKey: string) => void;
  className?: string;
}

export function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-soft",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        className="rounded-lg p-1.5 text-muted transition hover:bg-primary-50 hover:text-ink"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative">
        <span className="pointer-events-none block min-w-[112px] px-1 text-center text-xs font-bold text-ink">
          {monthLabel(value, "MMM yyyy")}
        </span>
        <input
          type="month"
          value={value}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Choose month"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        className="rounded-lg p-1.5 text-muted transition hover:bg-primary-50 hover:text-ink"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
