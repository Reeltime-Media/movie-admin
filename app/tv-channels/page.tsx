"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { AdminShell } from "../components/AdminShell";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { InlineLoading } from "../components/InlineLoading";
import { Button } from "../components/ui/Button";
import { useTvChannels } from "../hooks/adminQueries";
import { adminBadgeClass, type AdminBadgeTone, adminTdClass } from "../lib/adminUi";
import {
  deleteAdminTvChannel,
  startAdminTvChannel,
  stopAdminTvChannel,
  type ApiTvChannel,
} from "../lib/api";
import { mediaUrl } from "../lib/media";
import { queryKeys } from "../lib/queryKeys";

const PAGE_SIZE = 20;

function statusTone(status: string): AdminBadgeTone {
  if (status === "live") return "success";
  if (status === "starting") return "brand";
  if (status === "error") return "danger";
  return "muted";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function TvChannelsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const {
    data: channelsData,
    isLoading,
    isFetching,
    error: channelsError,
    refetch,
  } = useTvChannels(page, PAGE_SIZE);

  const channels = channelsData?.items ?? [];
  const pages = channelsData?.pages ?? 1;
  const total = channelsData?.total ?? 0;
  const error = channelsError
    ? channelsError instanceof Error
      ? channelsError.message
      : "Could not load TV channels."
    : null;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiTvChannel | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tv-channels"] });
  };

  const handleToggleStream = async (channel: ApiTvChannel) => {
    const isRunning = channel.status === "live" || channel.status === "starting";
    setBusyId(channel.id);
    try {
      const updated = isRunning
        ? await stopAdminTvChannel(channel.id)
        : await startAdminTvChannel(channel.id);
      queryClient.setQueryData(queryKeys.tvChannel(channel.id), updated);
      toast.success(isRunning ? "Stream stopped" : "Stream starting");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update stream");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemoveChannel = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await deleteAdminTvChannel(confirmDelete.id);
      toast.success("Channel deleted");
      setConfirmDelete(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete channel");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="TV channels">
      <AdminCard
        title="Live channels"
        flush
        headerAction={
          <Button href="/tv-channels/new" size="sm">
            New channel
          </Button>
        }
      >
        {isLoading && !channels.length ? (
          <InlineLoading label="Loading TV channels" />
        ) : error ? (
          <AdminErrorAlert message={error} onRetry={() => void refetch()} />
        ) : channels.length === 0 ? (
          <AdminEmptyState
            title="No TV channels yet"
            description="Create a channel to start restreaming a live source."
            action={
              <Button href="/tv-channels/new" size="sm">
                New channel
              </Button>
            }
          />
        ) : (
          <>
            <AdminTableWrap>
              <div className="-mx-5">
                <AdminTable minWidth="880px">
                  <AdminTableHead>
                    <AdminTh>Channel</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Access</AdminTh>
                    <AdminTh>Published</AdminTh>
                    <AdminTh>Updated</AdminTh>
                    <AdminTh className="text-right">Actions</AdminTh>
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {channels.map((channel) => {
                      const logoUrl = mediaUrl(channel.logo_key);
                      const isRunning =
                        channel.status === "live" || channel.status === "starting";
                      const isBusy = busyId === channel.id;

                      return (
                        <tr key={channel.id}>
                          <td className={adminTdClass}>
                            <div className="flex items-center gap-3">
                              <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
                                {logoUrl ? (
                                  <Image
                                    src={logoUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="36px"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/tv-channels/${channel.id}`}
                                  className="block truncate font-semibold text-text transition-colors hover:text-brand"
                                >
                                  {channel.name}
                                </Link>
                                <span className="block truncate font-mono text-2xs text-text-muted">
                                  {channel.slug}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={adminTdClass}>
                            <span className={adminBadgeClass(statusTone(channel.status))}>
                              {channel.status}
                            </span>
                            {channel.status === "error" && channel.status_error ? (
                              <span
                                className="mt-1 block max-w-56 truncate text-2xs text-danger"
                                title={channel.status_error}
                              >
                                {channel.status_error}
                              </span>
                            ) : null}
                          </td>
                          <td className={adminTdClass}>
                            <span className={adminBadgeClass(channel.is_free ? "brand" : "muted")}>
                              {channel.is_free ? "Free" : "Paid"}
                            </span>
                          </td>
                          <td className={adminTdClass}>
                            <span
                              className={adminBadgeClass(
                                channel.is_published ? "success" : "muted",
                              )}
                            >
                              {channel.is_published ? "Published" : "Unpublished"}
                            </span>
                          </td>
                          <td className={`${adminTdClass} text-text-muted`}>
                            {formatDate(channel.updated_at)}
                          </td>
                          <td className={`${adminTdClass} text-right`}>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant={isRunning ? "danger-soft" : "ghost"}
                                size="sm"
                                disabled={isBusy}
                                onClick={() => void handleToggleStream(channel)}
                              >
                                {isBusy ? "Working…" : isRunning ? "Stop" : "Start"}
                              </Button>
                              <Button href={`/tv-channels/${channel.id}`} variant="ghost" size="sm">
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="danger-soft"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => setConfirmDelete(channel)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </AdminTable>
              </div>
            </AdminTableWrap>
            <AdminPagination
              page={page}
              pages={pages}
              total={total}
              pageSize={PAGE_SIZE}
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminCard>

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-channel-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-channel-title" className="text-lg font-bold tracking-[-0.02em]">
              Delete channel
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Permanently delete <span className="font-bold text-text">{confirmDelete.name}</span>
              ? If the stream is live it will be stopped first. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={busyId === confirmDelete.id}
                onClick={() => void confirmRemoveChannel()}
              >
                {busyId === confirmDelete.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
