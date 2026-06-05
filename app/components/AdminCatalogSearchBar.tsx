"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { adminInputClass } from "../lib/adminUi";

export type AdminCatalogFilterOption = {
  value: string;
  label: string;
};

type AdminCatalogSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
  filterValue?: string;
  filterOptions?: AdminCatalogFilterOption[];
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
};

export function AdminCatalogSearchBar({
  value,
  onChange,
  placeholder = "Search by title, genre, slug, or description…",
  resultCount,
  totalCount,
  filterValue,
  filterOptions,
  onFilterChange,
  filterLabel = "Status",
}: AdminCatalogSearchBarProps) {
  const showCount =
    value.trim().length > 0 &&
    resultCount != null &&
    totalCount != null &&
    totalCount > 0;

  const hasFilter = Boolean(filterOptions?.length && onFilterChange && filterValue != null);

  return (
    <div className="space-y-1.5">
      <div
        className={[
          hasFilter ? "flex flex-col gap-3 sm:flex-row sm:items-stretch" : "",
          hasFilter ? "max-w-2xl" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={hasFilter ? "relative min-w-0 flex-1" : "relative max-w-md"}>
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

        {hasFilter ? (
          <label className="relative shrink-0 sm:w-[11.5rem]">
            <span className="sr-only">{filterLabel}</span>
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              aria-label={filterLabel}
              className={`${adminInputClass} appearance-none py-2 pl-3 pr-9`}
            >
              {filterOptions!.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
          </label>
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
