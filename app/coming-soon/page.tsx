"use client";

import { useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogSearchBar } from "../components/AdminCatalogSearchBar";
import { AdminPagination } from "../components/AdminPagination";
import { AdminShell } from "../components/AdminShell";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { Button } from "../components/ui/Button";
import { matchesCatalogSearch } from "../lib/catalogSearch";
import { ComingSoonTable } from "./ComingSoonTable";

const TABLE_PAGE_SIZE = 20;

export default function ComingSoonPage() {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const comingSoon = useMemo(
    () => movies.filter((m) => m.type === "Movie" && m.status === "Coming soon"),
    [movies],
  );

  const entries = useMemo(() => {
    if (!search.trim()) return comingSoon;
    return comingSoon.filter((m) => matchesCatalogSearch(m, search));
  }, [comingSoon, search]);

  const [prevSearch, setPrevSearch] = useState(search);
  let currentPage = page;
  if (search !== prevSearch) {
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
    <AdminShell title="Coming soon">
      <div className="space-y-6">
        <div className="space-y-4">
          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <span>{error}</span>
              <button type="button" onClick={refreshMovies} className="font-bold hover:underline">
                Retry
              </button>
            </div>
          ) : null}
          <p className="max-w-2xl text-sm text-text-muted">
            Announce a movie before its video is ready. Set a release date to auto-publish it once
            the video is uploaded and that date passes, or leave it blank and publish manually
            whenever it&rsquo;s ready.
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <AdminCatalogSearchBar
              className="flex-1"
              maxWidthClassName=""
              value={search}
              onChange={setSearch}
              placeholder="Search coming soon movies by title, genre, or description…"
              resultCount={entries.length}
              totalCount={comingSoon.length}
            />
            <Button href="/movie/new" className="shrink-0">
              Add coming soon movie
            </Button>
          </div>
        </div>

        {isLoading && comingSoon.length === 0 ? (
          <AdminCard title="Coming soon">
            <InlineLoading label="Loading coming soon movies" />
          </AdminCard>
        ) : (
          <ComingSoonTable
            entries={paginatedEntries}
            footer={
              entries.length > 0 ? (
                <AdminPagination
                  page={currentPage}
                  pages={pages}
                  total={entries.length}
                  pageSize={TABLE_PAGE_SIZE}
                  isLoading={isLoading}
                  onPageChange={setPage}
                />
              ) : null
            }
          />
        )}
      </div>
    </AdminShell>
  );
}
