import { Loader2 } from "lucide-react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

export function LoadingScreen({ label = "Getting your expenses ready…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-card">
          <span className="text-2xl font-extrabold">₱</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          {label}
        </div>
      </div>
    </div>
  );
}
