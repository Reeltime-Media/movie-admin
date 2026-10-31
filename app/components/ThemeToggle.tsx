"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({
  className = "",
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={[
        "inline-flex h-8 items-center justify-center gap-2 rounded-lg px-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
      {iconOnly ? null : <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
