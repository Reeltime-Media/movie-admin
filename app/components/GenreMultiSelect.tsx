"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GENRE_OPTIONS } from "../lib/genres";

const triggerClass =
  "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 py-2.5 text-left text-[13px] outline-none transition-colors hover:border-border-hover focus:border-border-hover focus:bg-surface-elevated";

const panelClass =
  "absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-surface-elevated py-1 shadow-lg";

type GenreMultiSelectProps = {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function GenreMultiSelect({ selected, onChange, disabled }: GenreMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const node = rootRef.current;
      if (!node) return;
      const target = e.target as Node;
      if (!node.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  const toggle = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else {
      onChange([...selected, genre]);
    }
  };

  const summary =
    selected.length === 0
      ? "Choose genres"
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.length} genres selected`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        id={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          triggerClass,
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          selected.length === 0 ? "text-text-disabled" : "text-text",
        ].join(" ")}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <svg
          className={["h-4 w-4 shrink-0 text-text-muted transition-transform", open ? "rotate-180" : ""].join(
            " ",
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
        </svg>
      </button>

      {open ? (
        <div className={panelClass} role="listbox" aria-labelledby={listId} aria-multiselectable>
          {GENRE_OPTIONS.map((genre) => {
            const checked = selected.includes(genre);
            return (
              <label
                key={genre}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-text hover:bg-bg"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border accent-brand"
                  checked={checked}
                  onChange={() => toggle(genre)}
                />
                <span>{genre}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
