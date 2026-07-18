"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45";

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand font-semibold text-white shadow-[0_0_0_1px_rgba(229,9,20,0.5),0_1px_12px_-2px_rgba(229,9,20,0.5)] hover:bg-brand-hover hover:shadow-[0_0_0_1px_rgba(255,31,45,0.6),0_2px_18px_-2px_rgba(229,9,20,0.7)] active:translate-y-px disabled:shadow-none",
  secondary:
    "border border-border bg-surface-elevated text-text hover:border-border-hover hover:bg-border/60",
  ghost:
    "border border-border bg-surface-elevated text-text-muted hover:border-border-hover hover:bg-border/60 hover:text-text",
  danger: "bg-danger font-semibold text-white hover:brightness-110 active:translate-y-px",
  // Soft destructive: tinted surface so the action still reads as a button.
  "danger-soft":
    "border border-danger/40 bg-danger/15 text-danger hover:border-danger/55 hover:bg-danger/25",
};

function content(loading: boolean, icon: ReactNode | undefined, children: ReactNode) {
  return (
    <>
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
      {children}
    </>
  );
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof CommonProps> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className = "",
    children,
    ...rest
  } = props;

  const cls = [base, sizeClass[size], variantClass[variant], className].filter(Boolean).join(" ");

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as Omit<ButtonAsLink, keyof CommonProps>;
    return (
      <Link {...linkRest} href={href} className={cls}>
        {content(loading, icon, children)}
      </Link>
    );
  }

  const btnRest = rest as ComponentPropsWithoutRef<"button">;
  // Spread first so the computed className/disabled always win over caller props.
  return (
    <button {...btnRest} className={cls} disabled={loading || btnRest.disabled}>
      {content(loading, icon, children)}
    </button>
  );
}
