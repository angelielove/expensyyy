"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { authErrorMessage, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/common/button";
import { Field, Input } from "@/components/common/input";
import { isValidEmail } from "@/lib/validation";

export default function LoginPage() {
  const { user, loading, login, register, loginGoogle, resetPassword, demoMode } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!resetMode && password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (resetMode) {
        await resetPassword(email);
        toast("Password reset email sent. Check your inbox.", "success");
        setResetMode(false);
      } else {
        await login(email, password);
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async () => {
    setBusy(true);
    setError(null);
    const demoEmail = "demo@expensyyy.app";
    const demoPassword = "demo1234";
    try {
      await login(demoEmail, demoPassword);
    } catch {
      try {
        await register("Demo User", demoEmail, demoPassword);
      } catch (caught) {
        setError(authErrorMessage(caught));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {resetMode ? "Reset password" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {resetMode
          ? "We'll email you a secure link to set a new password."
          : "Sign in to keep your household expenses in one tidy place."}
      </p>

      {demoMode ? (
        <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-[11px] font-medium leading-5 text-primary-800">
          Demo Mode is on. Your data stays in this browser. Add Firebase environment
          variables to use your real account.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Email" requiredMark>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              required
            />
          </div>
        </Field>

        {!resetMode ? (
          <Field label="Password" requiredMark>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" loading={busy} className="w-full">
          {resetMode ? "Send reset link" : "Sign in"}
          {!busy ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      {!resetMode && !demoMode ? (
        <>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                await loginGoogle();
              } catch (caught) {
                setError(authErrorMessage(caught));
              } finally {
                setBusy(false);
              }
            }}
          >
            Continue with Google
          </Button>
        </>
      ) : null}

      {demoMode && !resetMode ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => void handleDemo()}
          disabled={busy}
        >
          Explore with a demo account
        </Button>
      ) : null}

      <div className="mt-5 flex items-center justify-between text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setResetMode((value) => !value);
            setError(null);
          }}
          className="text-primary-700 hover:underline"
        >
          {resetMode ? "Back to sign in" : "Forgot password?"}
        </button>
        <Link href="/register" className="text-muted hover:text-ink">
          Create account
        </Link>
      </div>
    </div>
  );
}
