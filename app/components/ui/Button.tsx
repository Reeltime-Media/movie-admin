"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45";

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

const variantClass: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary:
    "border border-border bg-surface text-text hover:border-border-hover hover:bg-surface-soft",
  ghost: "text-text-muted hover:bg-surface-elevated hover:text-text",
  danger: "bg-danger text-white hover:bg-danger/90",
  // Quiet until hovered: a page of Delete buttons should not read as a page of alarms.
  "danger-soft": "text-text-muted hover:bg-danger/10 hover:text-danger",
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
