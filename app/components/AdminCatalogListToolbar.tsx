"use client";

import type { ReactNode } from "react";
import {
  AdminCatalogSearchBar,
  type AdminCatalogFilterOption,
} from "./AdminCatalogSearchBar";

type AdminCatalogListToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
  filterValue?: string;
  filterOptions?: AdminCatalogFilterOption[];
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  action: ReactNode;
};

/** Search + optional filter + primary action, capped at half the content width. */
export function AdminCatalogListToolbar({
  action,
  ...searchProps
}: AdminCatalogListToolbarProps) {
  return (
    <div className="flex w-full max-w-full flex-col gap-3 sm:max-w-[50%] sm:flex-row sm:items-stretch">
      <AdminCatalogSearchBar
        {...searchProps}
        className="min-w-0 flex-1"
        maxWidthClassName="w-full"
      />
      <div className="flex shrink-0 sm:self-stretch">{action}</div>
    </div>
  );
}
