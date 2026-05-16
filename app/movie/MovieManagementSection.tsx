"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { MovieManagementTable } from "./MovieManagementTable";
import type { ListFilter } from "./movieListTypes";

const tabs: { key: ListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movies", label: "Movies" },
  { key: "series", label: "Series" },
  { key: "drafts", label: "Drafts" },
];

function tableTitleForFilter(f: ListFilter): string {
  switch (f) {
    case "movies":
      return "Movies";
    case "series":
      return "Series";
    case "drafts":
      return "Drafts";
    default:
      return "All titles";
  }
}

export function MovieManagementSection() {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  const entries = useMemo(() => {
    switch (listFilter) {
      case "movies":
        return movies.filter((m) => m.type === "Movie");
      case "series":
        return movies.filter((m) => m.type === "Series");
      case "drafts":
        return movies.filter((m) => m.status === "Draft");
      default:
        return movies;
    }
  }, [movies, listFilter]);

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
            Manage the same movies and series surfaced in the Reeltime client. Use Movies or Series
            to show only that type. Sign in to load and manage movies from the API.
          </p>
          <Link
            href="/movie/new"
            className="shrink-0 rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Add
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
        {isLoading ? <p className="text-[12px] text-text-muted">Loading movies...</p> : null}
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

      <MovieManagementTable
        entries={entries}
        tableTitle={tableTitleForFilter(listFilter)}
        listFilter={listFilter}
      />
    </>
  );
}
