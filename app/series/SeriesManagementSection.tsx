"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogSearchBar } from "../components/AdminCatalogSearchBar";
import { AdminPagination } from "../components/AdminPagination";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { matchesCatalogSearch } from "../lib/catalogSearch";
import { adminPrimaryButtonClass } from "../lib/adminUi";
import { SeriesManagementTable } from "./SeriesManagementTable";
import type { SeriesListFilter } from "./seriesListTypes";

const TABLE_PAGE_SIZE = 25;

const filterOptions: { key: SeriesListFilter; label: string }[] = [
  { key: "all", label: "All series" },
  { key: "drafts", label: "Drafts" },
];

function tableTitleForFilter(f: SeriesListFilter): string {
  return f === "drafts" ? "Draft series" : "All series";
}

export function SeriesManagementSection() {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [listFilter, setListFilter] = useState<SeriesListFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const seriesOnly = useMemo(
    () => movies.filter((m) => m.type === "Series"),
    [movies],
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

  const pages = Math.max(1, Math.ceil(entries.length / TABLE_PAGE_SIZE));

  if (currentPage > pages) {
    currentPage = pages;
    setPage(pages);
  }

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * TABLE_PAGE_SIZE;
    return entries.slice(start, start + TABLE_PAGE_SIZE);
  }, [entries, currentPage]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Link
            href="/series/new"
            className={`shrink-0 ${adminPrimaryButtonClass}`}
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
        <AdminCatalogSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search series by title, genre, slug, episode, or description…"
          resultCount={entries.length}
          totalCount={seriesOnly.length}
          filterValue={listFilter}
          filterOptions={filterOptions.map(({ key, label }) => ({
            value: key,
            label,
          }))}
          onFilterChange={(next) => setListFilter(next as SeriesListFilter)}
          filterLabel="Filter series"
        />
      </div>

      {isLoading && seriesOnly.length === 0 ? (
        <AdminCard title={tableTitleForFilter(listFilter)}>
          <InlineLoading label="Loading series" />
        </AdminCard>
      ) : (
        <>
          <SeriesManagementTable
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
