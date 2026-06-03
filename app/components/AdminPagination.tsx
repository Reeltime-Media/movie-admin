"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  adminGhostButtonClass,
  adminPaginationInsetCardClass,
  adminPaginationInsetPanelClass,
  adminPaginationPageClass,
  adminPaginationWrapClass,
} from "../lib/adminUi";

type AdminPaginationProps = {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  /** Edge alignment inside bordered containers */
  inset?: "card" | "panel" | "none";
};

export function AdminPagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
  isLoading = false,
  inset = "card",
}: AdminPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const insetClass =
    inset === "card"
      ? adminPaginationInsetCardClass
      : inset === "panel"
        ? adminPaginationInsetPanelClass
        : "";

  return (
    <nav
      aria-label="Pagination"
      className={[adminPaginationWrapClass, insetClass, isLoading ? "opacity-70" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[12px] text-text-muted">
        Showing <span className="font-semibold text-text">{start}–{end}</span> of{" "}
        <span className="font-semibold text-text">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`inline-flex items-center gap-1.5 ${adminGhostButtonClass}`}
        >
          <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />
          Previous
        </button>
        <span className={adminPaginationPageClass} aria-current="page">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={isLoading || page >= pages}
          onClick={() => onPageChange(page + 1)}
          className={`inline-flex items-center gap-1.5 ${adminGhostButtonClass}`}
        >
          Next
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
