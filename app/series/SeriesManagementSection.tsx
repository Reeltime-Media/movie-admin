"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPagination } from "../components/AdminPagination";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { SeriesManagementTable } from "./SeriesManagementTable";
import type { SeriesListFilter } from "./seriesListTypes";

const TABLE_PAGE_SIZE = 25;

const tabs: { key: SeriesListFilter; label: string }[] = [
  { key: "all", label: "All series" },
  { key: "drafts", label: "Drafts" },
];

function tableTitleForFilter(f: SeriesListFilter): string {
  return f === "drafts" ? "Draft series" : "All series";
}

export function SeriesManagementSection() {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [listFilter, setListFilter] = useState<SeriesListFilter>("all");
  const [page, setPage] = useState(1);

  const entries = useMemo(() => {
    const seriesOnly = movies.filter((m) => m.type === "Series");
    if (listFilter === "drafts") {
      return seriesOnly.filter((s) => s.status === "Draft");
    }
    return seriesOnly;
  }, [movies, listFilter]);

  const pages = Math.max(1, Math.ceil(entries.length / TABLE_PAGE_SIZE));

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return entries.slice(start, start + TABLE_PAGE_SIZE);
  }, [entries, page]);

  useEffect(() => {
    setPage(1);
  }, [listFilter]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
            Manage series with seasons and episodes. Edit metadata, review episode readiness, and
            publish to the Reeltime catalog.
          </p>
          <Link
            href="/series/new"
            className="shrink-0 rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Add series
          </Link>
        </div>
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
            <span>{error}</span>
            <button type="button" onClick={refreshMovies} className="font-bold hover:underline">
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(({ key, label }) => {
            const active = listFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setListFilter(key)}
                className={[
                  "rounded-md px-3 py-2 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-text-muted hover:border-border-hover hover:text-text",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <SeriesManagementTable
        entries={paginatedEntries}
        tableTitle={tableTitleForFilter(listFilter)}
        listFilter={listFilter}
      />
      {entries.length > 0 ? (
        <AdminPagination
          page={page}
          pages={pages}
          total={entries.length}
          pageSize={TABLE_PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      ) : null}
      <LoadingOverlay open={isLoading} label="Loading series" />
    </>
  );
}
