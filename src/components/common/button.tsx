"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-400 disabled:bg-primary-300",
  secondary:
    "bg-primary-50 text-primary-800 hover:bg-primary-100 focus-visible:ring-primary-300 disabled:opacity-60",
  outline:
    "border border-line bg-surface text-ink hover:border-primary-300 hover:bg-primary-50 focus-visible:ring-primary-300 disabled:opacity-60",
  ghost:
    "text-muted hover:bg-primary-50 hover:text-ink focus-visible:ring-primary-300 disabled:opacity-60",
  danger:
    "bg-danger text-white shadow-sm hover:bg-[#c45656] focus-visible:ring-danger/40 disabled:opacity-60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-xs",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-5 text-sm",
  icon: "h-9 w-9 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
