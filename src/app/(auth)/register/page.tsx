"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { authErrorMessage, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/button";
import { Field, Input } from "@/components/common/input";
import { isStrongEnoughPassword, isValidEmail } from "@/lib/validation";

export default function RegisterPage() {
  const { user, loading, register, demoMode } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please tell us your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isStrongEnoughPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Start tracking groceries, bills, rent, and everyday spending with ease.
      </p>

      {demoMode ? (
        <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-[11px] font-medium leading-5 text-primary-800">
          Demo Mode: this account is stored only in this browser. Configure Firebase for
          secure cloud accounts.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Name" requiredMark>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="pl-10"
              autoComplete="name"
              required
            />
          </div>
        </Field>

        <Field label="Email" requiredMark>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              autoComplete="email"
              required
            />
          </div>
        </Field>

        <Field label="Password" hint="At least 6 characters." requiredMark>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
              autoComplete="new-password"
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

        <Field label="Confirm password" requiredMark>
          <Input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </Field>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-xs font-semibold text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-primary-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
