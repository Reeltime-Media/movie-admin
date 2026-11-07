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
import { SeriesCatalogReorder } from "./SeriesCatalogReorder";
import { SeriesManagementTable } from "./SeriesManagementTable";
import type { SeriesListFilter } from "./seriesListTypes";
import { ADMIN_PAGE_SIZE } from "../lib/pagination";


const filterOptions: { key: SeriesListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts" },
];

export function SeriesManagementSection({
  shortForm = false,
}: {
  shortForm?: boolean;
}) {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [listFilter, setListFilter] = useState<SeriesListFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isReordering, setIsReordering] = useState(false);

  const noun = shortForm ? "short series" : "series";
  const newHref = shortForm ? "/short-series/new" : "/series/new";
  const addLabel = shortForm ? "Add short series" : "Add series";

  const seriesOnly = useMemo(
    () =>
      movies
        .filter(
          (m) => m.type === "Series" && Boolean(m.isShortMovie) === shortForm,
        )
        .sort((a, b) => {
          const orderA = a.sortOrder ?? 0;
          const orderB = b.sortOrder ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }),
    [movies, shortForm],
  );

  const entries = useMemo(() => {
    let list = seriesOnly;
    if (listFilter === "drafts") {
      list = list.filter((s) => s.status === "Draft");
    }
    if (search.trim()) {
      list = list.filter((s) => matchesCatalogSearch(s, search));
    }
    return list;
  }, [seriesOnly, listFilter, search]);

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

  const tableTitle =
    listFilter === "drafts"
      ? shortForm
        ? "Draft short series"
        : "Draft series"
      : shortForm
        ? "All short series"
        : "All series";

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
          placeholder={`Search ${noun} by title, genre, slug, episode, or description…`}
          resultCount={entries.length}
          totalCount={seriesOnly.length}
          filterValue={listFilter}
          filterOptions={filterOptions.map(({ key, label }) => ({
            value: key,
            label: key === "all" ? (shortForm ? "All short series" : "All series") : label,
          }))}
          onFilterChange={(next) => setListFilter(next as SeriesListFilter)}
          filterLabel={`Filter ${noun}`}
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
              <Button href={newHref} className="w-full sm:w-auto" icon={<Plus size={14} aria-hidden />}>
                {addLabel}
              </Button>
            </div>
          }
        />
      </div>

      {isReordering ? (
        <SeriesCatalogReorder
          series={seriesOnly}
          shortForm={shortForm}
          onComplete={refreshMovies}
        />
      ) : isLoading && seriesOnly.length === 0 ? (
        <AdminCard title={tableTitle}>
          <InlineLoading label={`Loading ${noun}`} />
        </AdminCard>
      ) : (
        <>
          <SeriesManagementTable
            entries={paginatedEntries}
            listFilter={listFilter}
            shortForm={shortForm}
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
