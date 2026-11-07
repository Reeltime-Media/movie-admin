"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogListToolbar } from "../components/AdminCatalogListToolbar";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminMediaThumb } from "../components/AdminMediaThumb";
import { AdminPagination } from "../components/AdminPagination";
import { AdminShell } from "../components/AdminShell";
import { InlineLoading } from "../components/InlineLoading";
import { Button } from "../components/ui/Button";
import { useAdminPodcasts } from "../hooks/adminQueries";
import { statusClasses } from "../lib/adminData";
import { deleteAdminPodcast, listAllAdminPodcasts, type ApiContent } from "../lib/api";
import { PodcastCatalogReorder } from "./PodcastCatalogReorder";
import { formatPodcastDate, toUiStatus } from "./podcastUi";
import { ADMIN_PAGE_SIZE } from "../lib/pagination";


export default function PodcastsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetching, error: queryError, refetch } = useAdminPodcasts(
    page,
    ADMIN_PAGE_SIZE,
    search,
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load podcasts."
    : null;

  const [confirmDelete, setConfirmDelete] = useState<ApiContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [allPodcasts, setAllPodcasts] = useState<ApiContent[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const handleToggleReorder = async () => {
    if (!isReordering) {
      setIsLoadingAll(true);
      try {
        const full = await listAllAdminPodcasts();
        setAllPodcasts(full);
        setIsReordering(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load podcasts for reordering");
      } finally {
        setIsLoadingAll(false);
      }
    } else {
      setIsReordering(false);
    }
  };

  const handleReorderComplete = async () => {
    void queryClient.invalidateQueries({ queryKey: ["podcasts"] });
    const full = await listAllAdminPodcasts().catch(() => []);
    setAllPodcasts(full);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminPodcast(confirmDelete.id);
      toast.success("Podcast deleted");
      setConfirmDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["podcasts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete podcast");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminShell title="Podcast management">
      <div className="mb-4">
        <AdminCatalogListToolbar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search podcasts by title or description…"
          resultCount={search.trim() ? total : undefined}
          totalCount={total}
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant={isReordering ? "primary" : "secondary"}
                icon={<ArrowUpDown size={14} aria-hidden />}
                onClick={() => void handleToggleReorder()}
                loading={isLoadingAll}
                className="w-full sm:w-auto"
              >
                {isReordering ? "Back to list" : "Reorder catalog"}
              </Button>
              <Button href="/podcast/new" className="w-full sm:w-auto">
                Add podcast
              </Button>
            </div>
          }
        />
      </div>

      {error ? <AdminErrorAlert message={error} onRetry={() => void refetch()} /> : null}

      {isReordering ? (
        <PodcastCatalogReorder podcasts={allPodcasts} onComplete={handleReorderComplete} />
      ) : isLoading && items.length === 0 ? (
        <AdminCard title="Podcasts">
          <InlineLoading label="Loading podcasts" />
        </AdminCard>
      ) : items.length === 0 ? (
        search.trim() ? (
          <AdminEmptyState
            title="No matching podcasts"
            description="Try a different search, or clear the filter."
          />
        ) : (
          <AdminEmptyState
            title="No podcasts yet"
            description="Create a draft, upload cover and audio, then publish."
            action={
              <Button href="/podcast/new" size="sm">
                Add podcast
              </Button>
            }
          />
        )
      ) : (
        <section>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => {
                const uiStatus = toUiStatus(item.status);
                return (
                  <article
                    key={item.id}
                    className="group flex min-w-0 flex-col"
                  >
                    <button
                      type="button"
                      className="relative block w-full cursor-pointer text-left"
                      onClick={() => router.push(`/podcast/${item.id}`)}
                    >
                      <AdminMediaThumb
                        objectKey={item.poster_key}
                        alt={`${item.title} cover`}
                        className="aspect-2/3 w-full rounded-lg border-0"
                        emptyLabel="No cover"
                      />
                      <span className="absolute left-2 top-2">
                        <span className={statusClasses(uiStatus)}>{uiStatus}</span>
                      </span>
                      {item.sort_order !== undefined ? (
                        <span className="absolute right-2 top-2">
                          <span className="rounded-md bg-surface/90 px-1.5 py-0.5 text-2xs font-bold tabular-nums text-text shadow-sm ring-1 ring-border">
                            #{item.sort_order + 1}
                          </span>
                        </span>
                      ) : null}
                      <span className="pointer-events-none absolute inset-0 bg-linear-to-t rounded-lg from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>

                    <div className="flex min-h-0 flex-1 flex-col gap-1.5 pt-2.5">
                      <button
                        type="button"
                        className="min-w-0 cursor-pointer text-left"
                        onClick={() => router.push(`/podcast/${item.id}`)}
                      >
                        <h3 className="truncate text-sm font-semibold text-text transition-colors group-hover:text-brand">
                          {item.title}
                        </h3>
                        {item.title_km?.trim() ? (
                          <p className="mt-0.5 truncate text-2xs text-text-muted">{item.title_km}</p>
                        ) : null}
                        <p className="mt-1.5 truncate text-2xs text-text-muted">
                          {[
                            item.is_free ? "Free" : "With plan",
                            item.audio_key ? "Audio ready" : "No audio",
                            formatPodcastDate(item.updated_at),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </button>

                      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                        <Button
                          href={`/podcast/${item.id}/edit`}
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger-soft"
                          size="sm"
                          onClick={() => setConfirmDelete(item)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {total > 0 ? (
              <AdminPagination
                inset="none"
                page={page}
                pages={pages}
                total={total}
                pageSize={ADMIN_PAGE_SIZE}
                isLoading={isFetching}
                onPageChange={setPage}
              />
            ) : null}
        </section>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-text">Delete podcast?</h2>
            <p className="mt-2 text-sm text-text-muted">
              This permanently removes <span className="font-semibold text-text">{confirmDelete.title}</span>{" "}
              and its assets from the catalog.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={isDeleting} onClick={() => void handleDelete()}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
