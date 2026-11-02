"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Minus, Plus } from "lucide-react";
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

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  prefix?: ReactNode;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ className, prefix, step = "any", style, ...props }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const numericValue =
      typeof props.value === "number" ? props.value : Number(props.value);
    const hasValue =
      props.value !== "" && props.value !== undefined && props.value !== null;
    const minValue =
      props.min !== undefined && props.min !== "" ? Number(props.min) : -Infinity;
    const maxValue =
      props.max !== undefined && props.max !== "" ? Number(props.max) : Infinity;
    const atMin =
      hasValue && Number.isFinite(numericValue) && numericValue <= minValue;
    const atMax =
      hasValue && Number.isFinite(numericValue) && numericValue >= maxValue;

    const nudge = (delta: number) => {
      const input = inputRef.current;
      if (!input || input.disabled || input.readOnly) return;
      const current = input.value === "" ? 0 : Number(input.value);
      if (!Number.isFinite(current)) return;
      const next = Math.min(Math.max(current + delta, minValue), maxValue);
      if (next === current) return;
      const value = String(Number(next.toFixed(10)));
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!setValue) return;
      setValue.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    return (
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          ref={inputRef}
          className={cn(baseField, className, "min-w-[6.5rem] text-center")}
          {...props}
          style={{
            ...style,
            paddingLeft: prefix ? "3.5rem" : "2.25rem",
            paddingRight: prefix ? "3.5rem" : "2.25rem",
            textAlign: "center",
          }}
          type="number"
          step={step}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(-1)}
          onMouseDown={(event) => event.preventDefault()}
          disabled={props.disabled || props.readOnly || atMin}
          className="absolute inset-y-1 left-1 flex w-6 items-center justify-center rounded-md border border-line bg-surface text-muted shadow-sm transition hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Decrease value by 1"
          title="Decrease by 1"
        >
          <Minus className="h-3 w-3" strokeWidth={2.75} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(1)}
          onMouseDown={(event) => event.preventDefault()}
          disabled={props.disabled || props.readOnly || atMax}
          className="absolute inset-y-1 right-1 flex w-6 items-center justify-center rounded-md border border-line bg-surface text-muted shadow-sm transition hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Increase value by 1"
          title="Increase by 1"
        >
          <Plus className="h-3 w-3" strokeWidth={2.75} />
        </button>
      </div>
    );
  },
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type, ...props }, ref) {
    if (type === "number") {
      return <NumberInput ref={ref} className={className} type={type} {...props} />;
    }
    return <input ref={ref} type={type} className={cn(baseField, className)} {...props} />;
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
    <NumberInput
      prefix={currencySymbol(profile?.currency)}
      min="0"
      inputMode="decimal"
      className={className}
      {...props}
    />
  );
}
