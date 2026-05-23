"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function LoadingOverlay({
  open,
  label = "Loading…",
}: {
  open: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex w-full max-w-[280px] flex-col items-center rounded-xl border border-border bg-surface px-8 py-10 shadow-2xl shadow-black/50">
        <div className="relative h-16 w-16" aria-hidden>
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand border-r-brand/80"
            style={{ animationDuration: "0.85s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand text-[15px] font-black text-white shadow-lg shadow-brand/30">
              R
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-[14px] font-bold tracking-[-0.02em] text-text">
          {label}
        </p>
        <p className="mt-1.5 text-center text-[12px] text-text-muted">Please wait</p>
        <div className="mt-5 flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
