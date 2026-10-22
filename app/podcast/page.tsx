"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminCatalogSearchBar } from "../components/AdminCatalogSearchBar";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { AdminShell } from "../components/AdminShell";
import { InlineLoading } from "../components/InlineLoading";
import { Button } from "../components/ui/Button";
import { useAdminPodcasts } from "../hooks/adminQueries";
import { statusClasses } from "../lib/adminData";
import { deleteAdminPodcast, type ApiContent } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { formatPodcastDate, toUiStatus } from "./podcastUi";

const PAGE_SIZE = 20;

export default function PodcastsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetching, error: queryError, refetch } = useAdminPodcasts(page, PAGE_SIZE);

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load podcasts."
    : null;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [item.title, item.title_km, item.slug, item.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const [confirmDelete, setConfirmDelete] = useState<ApiContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <AdminCatalogSearchBar
          className="flex-1"
          maxWidthClassName=""
          value={search}
          onChange={setSearch}
          placeholder="Search podcasts by title or description…"
          resultCount={filteredItems.length}
          totalCount={items.length}
        />
        <Button href="/podcast/new" className="shrink-0">
          Add podcast
        </Button>
      </div>

      {error ? <AdminErrorAlert message={error} onRetry={() => void refetch()} /> : null}

      {isLoading && items.length === 0 ? (
        <AdminCard title="Podcasts">
          <InlineLoading label="Loading podcasts" />
        </AdminCard>
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No podcasts yet"
          description="Create a draft, upload cover and audio, then publish."
          action={
            <Button href="/podcast/new" size="sm">
              Add podcast
            </Button>
          }
        />
      ) : filteredItems.length === 0 ? (
        <AdminEmptyState
          title="No matching podcasts"
          description="Try a different search, or clear the filter."
        />
      ) : (
        <section className="border border-border bg-surface">
          <div className="px-5 pb-5 pt-5">
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
                    <th className="px-5 pb-2.5 font-semibold">Cover</th>
                    <th className="px-5 pb-2.5 font-semibold">Title</th>
                    <th className="px-5 pb-2.5 font-semibold">Access</th>
                    <th className="px-5 pb-2.5 font-semibold">Audio</th>
                    <th className="px-5 pb-2.5 font-semibold">Status</th>
                    <th className="px-5 pb-2.5 font-semibold">Updated</th>
                    <th className="px-5 pb-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map((item) => {
                    const poster = mediaUrl(item.poster_key, item.updated_at);
                    const uiStatus = toUiStatus(item.status);
                    return (
                      <tr
                        key={item.id}
                        role="link"
                        tabIndex={0}
                        className="group cursor-pointer transition-colors hover:bg-surface-elevated"
                        onClick={() => router.push(`/podcast/${item.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/podcast/${item.id}`);
                          }
                        }}
                      >
                        <td className="px-5 py-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-surface-elevated">
                            {poster ? (
                              <Image src={poster} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-2xs text-text-disabled">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="max-w-56 truncate font-medium text-text group-hover:text-brand">
                            {item.title}
                          </div>
                          {item.title_km ? (
                            <div className="max-w-56 truncate text-2xs text-text-muted">{item.title_km}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-text-muted">
                          {item.is_free ? "Free" : "Included with Plan"}
                        </td>
                        <td className="px-5 py-3 text-text-muted">{item.audio_key ? "Ready" : "Missing"}</td>
                        <td className="px-5 py-3">
                          <span className={statusClasses(uiStatus)}>{uiStatus}</span>
                        </td>
                        <td className="px-5 py-3 text-text-muted">{formatPodcastDate(item.updated_at)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              href={`/podcast/${item.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </Button>
                            <Button
                              href={`/podcast/${item.id}/edit`}
                              variant="secondary"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="danger-soft"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(item);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total > 0 ? (
              <AdminPagination
                page={page}
                pages={pages}
                total={total}
                pageSize={PAGE_SIZE}
                isLoading={isFetching}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        </section>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-sm font-bold text-text">Delete podcast?</h2>
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
