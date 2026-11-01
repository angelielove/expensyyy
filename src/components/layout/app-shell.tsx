"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  RefreshCw,
  Settings,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/common/button";
import { LoadingScreen } from "@/components/common/spinner";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/grocery", label: "Grocery", icon: ShoppingBasket },
  { href: "/bills", label: "Bills", icon: ReceiptText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, logout, demoMode } = useAuth();
  const { profile, error, reload, refreshing, loading } = useData();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <LoadingScreen />;

  const displayName = profile?.displayName || user.displayName || "Friend";
  const household = profile?.householdName || "My Household";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>

        <div className="mt-6 rounded-2xl bg-primary-50 px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
            Household
          </p>
          <p className="mt-0.5 truncate text-sm font-extrabold text-ink">{household}</p>
          <p className="mt-0.5 text-[11px] text-muted">Tracked in {profile?.currency ?? "PHP"}</p>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-muted hover:bg-primary-50 hover:text-ink",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {demoMode ? (
          <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-800">
              <Sparkles className="h-3 w-3" /> Demo mode
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-primary-700">
              Data lives in this browser only.
            </p>
          </div>
        ) : null}

        <div className="border-t border-line pt-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-extrabold text-primary-800">
              {profile?.photoURL || user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile?.photoURL || user.photoURL}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(displayName)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{displayName}</p>
              <p className="truncate text-[10px] text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          {refreshing ? <RefreshCw className="h-4 w-4 animate-spin text-muted" /> : null}
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-[11px] font-extrabold text-primary-800"
          >
            {profile?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoURL} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials(displayName)
            )}
          </Link>
        </div>
      </header>

      <div className="md:pl-[248px]">
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-7">
          {error ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-medium text-danger">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => void reload()}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : null}
          {loading ? <LoadingScreen label="Loading your expenses…" /> : children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-7">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[9px] font-bold transition",
                  active ? "text-primary-700" : "text-muted",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active && "text-primary-600")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
