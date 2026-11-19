"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminCatalogListToolbar } from "../../components/AdminCatalogListToolbar";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { AdminErrorAlert } from "../../components/AdminErrorAlert";
import { AdminMediaThumb } from "../../components/AdminMediaThumb";
import { AdminShell } from "../../components/AdminShell";
import { InlineLoading } from "../../components/InlineLoading";
import { Button } from "../../components/ui/Button";
import { useClientAuthReady } from "../../hooks/adminQueries";
import { adminStatusLineClass } from "../../lib/adminUi";
import { getAdminToken, listAllAdminMovies } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { formatMatchDate, matchResult, matchSearchText } from "./matchFormat";

type Filter = "all" | "published" | "drafts";

const filterOptions = [
  { value: "all", label: "All matches" },
  { value: "published", label: "Published" },
  { value: "drafts", label: "Drafts" },
];

export default function Tv5MatchesPage() {
  const isAuthReady = useClientAuthReady();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const query = useQuery({
    queryKey: queryKeys.tv5Matches,
    queryFn: () => listAllAdminMovies("tv5"),
    enabled: isAuthReady && Boolean(getAdminToken()),
  });

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((item) => {
      if (filter === "published" && item.status !== "published") return false;
      if (filter === "drafts" && item.status === "published") return false;
      return !q || matchSearchText(item).includes(q);
    });
  }, [query.data, search, filter]);

  const total = query.data?.length ?? 0;

  return (
    <AdminShell title="Kun Khmer">
      <AdminCatalogListToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search by fighter, event or title…"
        resultCount={matches.length}
        totalCount={total}
        filterValue={filter}
        filterOptions={filterOptions}
        onFilterChange={(value) => setFilter(value as Filter)}
        filterLabel="Filter matches"
        action={
          <Button href="/tv5/matches/new" icon={<Plus size={14} aria-hidden />}>
            Add match
          </Button>
        }
      />

      {query.isLoading ? (
        <InlineLoading label="Loading matches" />
      ) : query.error ? (
        <AdminErrorAlert
          message={query.error instanceof Error ? query.error.message : "Could not load matches."}
          onRetry={() => void query.refetch()}
        />
      ) : total === 0 ? (
        <AdminEmptyState
          title="No Kun Khmer matches yet"
          description="Add a match with its fighters, poster and video. It appears only in the TV5 app."
          action={<Button href="/tv5/matches/new">Add match</Button>}
        />
      ) : matches.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">No matches fit this search.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {matches.map((item) => {
            const card = item.match;
            const meta = [card?.event_name, formatMatchDate(card?.match_date ?? null)]
              .filter(Boolean)
              .join(" · ");
            const result = card ? matchResult(card) : null;
            return (
              <li key={item.id} className="min-w-0">
                <Link href={`/tv5/matches/${item.id}`} className="group block">
                  <AdminMediaThumb
                    objectKey={item.poster_key}
                    alt=""
                    emptyLabel="No poster"
                    className="aspect-2/3 w-full rounded-lg border-0"
                  />
                  <p className="mt-2 truncate text-sm font-medium text-text group-hover:text-brand">
                    {item.title}
                  </p>
                  {meta ? <p className="truncate text-xs text-text-muted">{meta}</p> : null}
                  {result ? <p className="truncate text-xs text-text-muted">{result}</p> : null}
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={adminStatusLineClass(
                        item.status === "published" ? "success" : "muted",
                      )}
                    >
                      {item.status === "published" ? "Published" : "Draft"}
                    </span>
                    {item.is_free ? (
                      <span className="text-xs font-medium text-brand">Free</span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
