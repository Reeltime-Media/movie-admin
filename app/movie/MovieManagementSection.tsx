"use client";

import { ArrowUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogListToolbar } from "../components/AdminCatalogListToolbar";
import { AdminPagination } from "../components/AdminPagination";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { matchesCatalogSearch } from "../lib/catalogSearch";
import { Button } from "../components/ui/Button";
import { MovieCatalogReorder } from "./MovieCatalogReorder";
import { MovieManagementTable } from "./MovieManagementTable";
import type { ListFilter } from "./movieListTypes";
import { ADMIN_PAGE_SIZE } from "../lib/pagination";


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
  const [isReordering, setIsReordering] = useState(false);

  const moviesOnly = useMemo(
    () =>
      movies
        .filter((m) => m.type === "Movie")
        .sort((a, b) => {
          const orderA = a.sortOrder ?? 0;
          const orderB = b.sortOrder ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }),
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

  const [prevListFilter, setPrevListFilter] = useState(listFilter);
  const [prevSearch, setPrevSearch] = useState(search);

  let currentPage = page;
  if (listFilter !== prevListFilter || search !== prevSearch) {
    setPrevListFilter(listFilter);
    setPrevSearch(search);
    currentPage = 1;
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(entries.length / ADMIN_PAGE_SIZE));

  if (currentPage > pages) {
    currentPage = pages;
    setPage(pages);
  }

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ADMIN_PAGE_SIZE;
    return entries.slice(start, start + ADMIN_PAGE_SIZE);
  }, [entries, currentPage]);

  return (
    <>
      <div className="space-y-4">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <span>{error}</span>
            <button type="button" onClick={refreshMovies} className="font-semibold hover:underline">
              Retry
            </button>
          </div>
        ) : null}
        <AdminCatalogListToolbar
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
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant={isReordering ? "primary" : "secondary"}
                icon={<ArrowUpDown size={14} aria-hidden />}
                onClick={() => setIsReordering((prev) => !prev)}
                className="w-full sm:w-auto"
              >
                {isReordering ? "Back to list" : "Reorder catalog"}
              </Button>
              <Button href="/movie/new" className="w-full sm:w-auto" icon={<Plus size={14} aria-hidden />}>
                Add movie
              </Button>
            </div>
          }
        />
      </div>

      {isReordering ? (
        <MovieCatalogReorder movies={moviesOnly} onComplete={refreshMovies} />
      ) : isLoading && moviesOnly.length === 0 ? (
        <AdminCard title={tableTitleForFilter(listFilter)}>
          <InlineLoading label="Loading movies" />
        </AdminCard>
      ) : (
        <>
          <MovieManagementTable
            entries={paginatedEntries}
            listFilter={listFilter}
            footer={
              entries.length > 0 ? (
                <AdminPagination
                  inset="none"
                  page={currentPage}
                  pages={pages}
                  total={entries.length}
                  pageSize={ADMIN_PAGE_SIZE}
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
