import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
        <Wallet className="h-5 w-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight text-ink">Expensyyy</p>
          <p className="text-[10px] font-semibold text-muted">everyday expense companion</p>
        </div>
      ) : null}
    </div>
  );
}
