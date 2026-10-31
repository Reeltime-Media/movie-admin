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

/** Back control with arrow + label. */
export function BackButton({
  href,
  onClick,
  label = "Back",
  size = "md",
  className = "",
}: BackButtonProps) {
  const shared = {
    variant: "secondary" as const,
    size,
    className: ["shrink-0", className].filter(Boolean).join(" "),
    "aria-label": label,
    title: label,
    icon: <ArrowLeft size={15} aria-hidden />,
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
