"use client";

import { Search, X } from "lucide-react";
import { adminInputClass } from "../lib/adminUi";

type AdminCatalogSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
};

export function AdminCatalogSearchBar({
  value,
  onChange,
  placeholder = "Search by title, genre, slug, or description…",
  resultCount,
  totalCount,
}: AdminCatalogSearchBarProps) {
  const showCount =
    value.trim().length > 0 &&
    resultCount != null &&
    totalCount != null &&
    totalCount > 0;

  return (
    <div className="space-y-1.5">
      <div className="relative max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${adminInputClass} py-2 pl-9 pr-9`}
          autoComplete="off"
          aria-label="Search catalog"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {showCount ? (
        <p className="text-[12px] text-text-muted">
          {resultCount} of {totalCount} match &ldquo;{value.trim()}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
