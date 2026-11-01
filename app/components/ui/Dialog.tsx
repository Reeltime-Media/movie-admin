"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "h-[min(90vh,760px)] max-w-2xl",
};

export function Dialog({
  title,
  description,
  size = "sm",
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  size?: keyof typeof sizeClass;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl outline-none ${sizeClass[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-text">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        {children ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">{children}</div>
        ) : (
          <div className="h-5 shrink-0" />
        )}
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
