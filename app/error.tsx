"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("Admin runtime error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={28} aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-bold text-text">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        An unexpected error occurred while rendering this view.
      </p>
      {error.message ? (
        <pre className="mt-3 max-w-lg overflow-x-auto rounded-lg border border-border bg-surface px-4 py-2 text-left font-mono text-xs text-text-muted">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          icon={<RefreshCw size={14} aria-hidden />}
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
