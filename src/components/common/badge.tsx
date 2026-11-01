import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-background text-muted ring-1 ring-line",
  primary: "bg-primary-50 text-primary-800 ring-1 ring-primary-200",
  success: "bg-success/10 text-success ring-1 ring-success/20",
  warning: "bg-warning/10 text-[#a97426] ring-1 ring-warning/25",
  danger: "bg-danger/10 text-danger ring-1 ring-danger/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  paid: "success",
  completed: "success",
  unpaid: "neutral",
  draft: "neutral",
  partial: "warning",
  overdue: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "primary";
  return <Badge tone={tone}>{status.replace("_", " ")}</Badge>;
}
