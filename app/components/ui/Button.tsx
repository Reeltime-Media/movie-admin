"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_1px_3px_rgba(229,9,20,0.25),0_0_0_1px_rgba(229,9,20,0.08)] hover:bg-brand-hover hover:shadow-[0_2px_8px_rgba(229,9,20,0.35),0_0_0_1px_rgba(229,9,20,0.12)] active:scale-[0.98] active:shadow-none disabled:shadow-none",
  secondary:
    "border border-border bg-surface text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
  ghost: "text-text-muted hover:bg-surface-elevated hover:text-text",
  danger: "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
  "danger-soft":
    "border border-danger/40 bg-danger/10 text-danger hover:border-danger/55 hover:bg-danger/15",
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
