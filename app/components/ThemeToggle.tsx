"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={[
        "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-text",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
