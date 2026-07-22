import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const controlClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-white focus:border-border-hover focus:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60";

export const fieldLabelClass =
  "mb-1.5 block text-2xs font-bold uppercase tracking-[0.12em] text-text-disabled";

export function Input({
  error = false,
  className = "",
  ...props
}: { error?: boolean } & ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={[controlClass, error ? "border-danger focus:border-danger" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Textarea({
  error = false,
  className = "",
  ...props
}: { error?: boolean } & ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={[
        controlClass,
        "min-h-20 resize-y",
        error ? "border-danger focus:border-danger" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
