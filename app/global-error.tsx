"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global admin crash caught by global-error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-sans text-text">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold">Admin Console Error</h1>
          <p className="mt-2 text-sm text-text-muted">
            The admin console encountered a critical error.
          </p>
          {error.message ? (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-background p-3 text-left font-mono text-xs text-text-muted">
              {error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-hover cursor-pointer"
            >
              Reload interface
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover cursor-pointer"
            >
              Go to home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
