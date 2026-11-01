import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "green" | "blue" | "amber" | "rose" | "violet" | "slate";

const tones: Record<Tone, { icon: string; value: string; bar: string }> = {
  green: { icon: "bg-primary-50 text-primary-700", value: "text-ink", bar: "bg-primary-400" },
  blue: { icon: "bg-[#EAF2F3] text-[#4B8A8F]", value: "text-ink", bar: "bg-[#7FB6BA]" },
  amber: { icon: "bg-warning/10 text-[#b27d2a]", value: "text-ink", bar: "bg-warning" },
  rose: { icon: "bg-danger/10 text-danger", value: "text-ink", bar: "bg-danger" },
  violet: { icon: "bg-[#F1EDF7] text-[#7C6AA0]", value: "text-ink", bar: "bg-[#A08CC4]" },
  slate: { icon: "bg-background text-muted", value: "text-ink", bar: "bg-line" },
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  className?: string;
}

export function StatCard({ label, value, hint, icon, tone = "green", className }: StatCardProps) {
  const styles = tones[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line/70 bg-surface p-4 shadow-soft",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className={cn("mt-1.5 truncate text-xl font-extrabold tracking-tight", styles.value)}>
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-[11px] text-muted">{hint}</p> : null}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
          {icon}
        </div>
      </div>
      <div className={cn("mt-3 h-1 w-10 rounded-full", styles.bar)} />
    </div>
  );
}
