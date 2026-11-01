"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { useData } from "@/contexts/DataContext";
import { currencySymbol } from "@/lib/format";

const baseField =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-background";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, requiredMark, children, className }: FieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label ? (
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
          {requiredMark ? <span className="text-danger">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="block text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseField, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(baseField, "appearance-none pr-8", className)} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseField, "min-h-[84px]", className)} {...props} />;
  },
);

export function MoneyInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const { profile } = useData();
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
        {currencySymbol(profile?.currency)}
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        className={cn(baseField, "pl-8", className)}
        {...props}
      />
    </div>
  );
}
