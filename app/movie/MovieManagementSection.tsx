"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogSearchBar } from "../components/AdminCatalogSearchBar";
import { AdminPagination } from "../components/AdminPagination";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { matchesCatalogSearch } from "../lib/catalogSearch";
import { adminPrimaryButtonClass } from "../lib/adminUi";
import { MovieManagementTable } from "./MovieManagementTable";
import type { ListFilter } from "./movieListTypes";

const TABLE_PAGE_SIZE = 25;

const filterOptions: { key: ListFilter; label: string }[] = [
  { key: "all", label: "All movies" },
  { key: "drafts", label: "Drafts" },
];

function tableTitleForFilter(f: ListFilter): string {
  return f === "drafts" ? "Draft movies" : "All movies";
}

export function MovieManagementSection() {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const moviesOnly = useMemo(
    () => movies.filter((m) => m.type === "Movie"),
    [movies],
  );

  const entries = useMemo(() => {
    let list = moviesOnly;
    if (listFilter === "drafts") {
      list = list.filter((m) => m.status === "Draft");
    }
    if (search.trim()) {
      list = list.filter((m) => matchesCatalogSearch(m, search));
    }
    return list;
  }, [moviesOnly, listFilter, search]);

  const pages = Math.max(1, Math.ceil(entries.length / TABLE_PAGE_SIZE));

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return entries.slice(start, start + TABLE_PAGE_SIZE);
  }, [entries, page]);

  useEffect(() => {
    setPage(1);
  }, [listFilter, search]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted"></p>
          <Link
            href="/movie/new"
            className={`shrink-0 ${adminPrimaryButtonClass}`}
          >
            Add movie
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
        <AdminCatalogSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search movies by title, genre, slug, or description…"
          resultCount={entries.length}
          totalCount={moviesOnly.length}
          filterValue={listFilter}
          filterOptions={filterOptions.map(({ key, label }) => ({
            value: key,
            label,
          }))}
          onFilterChange={(next) => setListFilter(next as ListFilter)}
          filterLabel="Filter movies"
        />
      </div>

      {isLoading && moviesOnly.length === 0 ? (
        <AdminCard title={tableTitleForFilter(listFilter)}>
          <InlineLoading label="Loading movies" />
        </AdminCard>
      ) : (
        <>
          <MovieManagementTable
            entries={paginatedEntries}
            tableTitle={tableTitleForFilter(listFilter)}
            listFilter={listFilter}
            footer={
              entries.length > 0 ? (
                <AdminPagination
                  page={page}
                  pages={pages}
                  total={entries.length}
                  pageSize={TABLE_PAGE_SIZE}
                  isLoading={isLoading}
                  onPageChange={setPage}
                />
              ) : null
            }
          />
        </>
      )}
    </>
  );
}
