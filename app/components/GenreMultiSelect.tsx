"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GENRE_OPTIONS } from "../lib/genres";

const triggerClass =
  "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 py-2.5 text-left text-[13px] outline-none transition-colors hover:border-border-hover focus:border-border-hover focus:bg-surface-elevated";

const panelClass =
  "absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-surface-elevated py-1";

type GenreMultiSelectProps = {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  options?: string[];
  onDeleteGenre?: (name: string) => void;
};

export function GenreMultiSelect({ selected, onChange, disabled, options, onDeleteGenre }: GenreMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const allOptions = options ?? GENRE_OPTIONS;

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

  const handleDelete = async (genre: string) => {
    if (!onDeleteGenre) return;
    setDeleting(genre);
    try {
      onDeleteGenre(genre);
    } finally {
      setDeleting(null);
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
          className={["h-4 w-4 shrink-0 text-text-muted transition-transform", open ? "rotate-180" : ""].join(" ")}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
        </svg>
      </button>

      {open ? (
        <div className={panelClass} role="listbox" aria-labelledby={listId} aria-multiselectable>
          {allOptions.map((genre) => {
            const checked = selected.includes(genre);
            const isDeleting = deleting === genre;
            return (
              <div
                key={genre}
                className="group flex items-center gap-2.5 px-3 py-2 text-[13px] text-text hover:bg-bg"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 shrink-0 rounded border-border accent-brand"
                    checked={checked}
                    onChange={() => toggle(genre)}
                  />
                  <span className="truncate">{genre}</span>
                </label>
                {onDeleteGenre ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(genre)}
                    aria-label={`Delete ${genre}`}
                    className="shrink-0 rounded p-0.5 text-text-disabled opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 disabled:opacity-40"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M6.5 1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3ZM3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4H3.5a.5.5 0 0 1-.5-.5ZM5 4v8h6V4H5Z"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
