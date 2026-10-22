"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/Button";

type BackButtonProps = {
  href?: string;
  onClick?: () => void;
  /** Visible label + accessible name. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/** Back control with arrow + label — sized to match wizard/step chrome. */
export function BackButton({
  href,
  onClick,
  label = "Back",
  size = "md",
  className = "",
}: BackButtonProps) {
  const iconSize = size === "sm" ? 16 : 18;
  // Important height so we beat Button’s built-in h-7 / h-9.
  const sizing =
    size === "sm"
      ? "!h-9 gap-2 px-3 text-xs font-semibold"
      : "!h-10 gap-2 px-3.5 text-sm font-semibold";

  const shared = {
    variant: "secondary" as const,
    size,
    className: [sizing, "shrink-0", className].filter(Boolean).join(" "),
    "aria-label": label,
    title: label,
    icon: <ArrowLeft size={iconSize} strokeWidth={2.5} aria-hidden />,
  };

  if (href) {
    return (
      <Button {...shared} href={href}>
        Back
      </Button>
    );
  }

  return (
    <Button {...shared} type="button" onClick={onClick}>
      Back
    </Button>
  );
}
