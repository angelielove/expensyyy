import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#f6ecd9]/60 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl border border-line/80 bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>
        <p className="mt-5 text-center text-[11px] font-medium text-muted">
          Your everyday expense companion.
        </p>
      </div>
    </div>
  );
}
