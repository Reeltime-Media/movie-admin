"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminErrorAlert } from "../../components/AdminErrorAlert";
import { InlineLoading } from "../../components/InlineLoading";
import { Button } from "../../components/ui/Button";
import { useTvChannel } from "../../hooks/adminQueries";
import { adminBadgeClass, type AdminBadgeTone, adminInputClass, adminLabelClass } from "../../lib/adminUi";
import {
  deleteAdminTvChannel,
  refreshAdminTvChannelStatus,
  startAdminTvChannel,
  stopAdminTvChannel,
  updateAdminTvChannel,
  uploadAdminTvChannelLogo,
  type ApiTvChannel,
} from "../../lib/api";
import { mediaUrl } from "../../lib/media";
import { queryKeys } from "../../lib/queryKeys";

type DraftState = {
  name: string;
  description: string;
  sourceUrl: string;
  isFree: boolean;
  isPublished: boolean;
};

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3"
    >
      <span
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-success" : "bg-text-disabled/30",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
      <span className="text-xs font-semibold text-text">{label}</span>
    </button>
  );
}

export function TvChannelDetail({ channelId }: { channelId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: channel, isLoading, error: queryError, refetch } = useTvChannel(channelId);
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load channel detail"
    : null;

  const [prevId, setPrevId] = useState<string | null>(null);
  const [prevUpdatedAt, setPrevUpdatedAt] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (channel && (channel.id !== prevId || channel.updated_at !== prevUpdatedAt)) {
    setPrevId(channel.id);
    setPrevUpdatedAt(channel.updated_at);
    setDraft({
      name: channel.name,
      description: channel.description ?? "",
      sourceUrl: channel.source_url,
      isFree: channel.is_free,
      isPublished: channel.is_published,
    });
    setLogoFile(null);
    setSaveError(null);
  }

  const patchDraft = (patch: Partial<DraftState>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const logoPreviewUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile],
  );
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const applyUpdatedChannel = (updated: ApiTvChannel) => {
    queryClient.setQueryData(queryKeys.tvChannel(channelId), updated);
    void queryClient.invalidateQueries({ queryKey: ["tv-channels"] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const sourceUrl = draft.sourceUrl.trim();
    if (!name) {
      setSaveError("Enter a channel name.");
      return;
    }
    if (!sourceUrl) {
      setSaveError("Enter a source stream URL.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      let updated = await updateAdminTvChannel(channelId, {
        name,
        description: draft.description.trim() || null,
        sourceUrl,
        isFree: draft.isFree,
        isPublished: draft.isPublished,
      });

      if (logoFile) {
        updated = await uploadAdminTvChannelLogo(channelId, logoFile);
      }

      applyUpdatedChannel(updated);
      setLogoFile(null);
      toast.success("Channel saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save channel";
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStream = async () => {
    if (!channel) return;
    const isRunning = channel.status === "live" || channel.status === "starting";
    setStatusBusy(true);
    try {
      const updated = isRunning
        ? await stopAdminTvChannel(channelId)
        : await startAdminTvChannel(channelId);
      applyUpdatedChannel(updated);
      toast.success(isRunning ? "Stream stopped" : "Stream starting");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update stream");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleRefreshStatus = async () => {
    setStatusRefreshing(true);
    try {
      const updated = await refreshAdminTvChannelStatus(channelId);
      applyUpdatedChannel(updated);
      toast.success("Status refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh status");
    } finally {
      setStatusRefreshing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAdminTvChannel(channelId);
      void queryClient.invalidateQueries({ queryKey: ["tv-channels"] });
      toast.success("Channel deleted");
      router.push("/tv-channels");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete channel");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading || (channel && !draft)) {
    return (
      <AdminCard title="Channel detail">
        <InlineLoading label="Loading channel" />
      </AdminCard>
    );
  }

  if (error) {
    return <AdminErrorAlert message={error} onRetry={() => void refetch()} />;
  }

  if (!channel || !draft) {
    return (
      <AdminCard title="Channel not found">
        <p className="text-sm text-text-muted">This TV channel could not be found.</p>
        <Button href="/tv-channels" variant="secondary" className="mt-4">
          Back to TV channels
        </Button>
      </AdminCard>
    );
  }

  const isRunning = channel.status === "live" || channel.status === "starting";
  const logoUrl = logoPreviewUrl ?? mediaUrl(channel.logo_key);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-[-0.02em]">{channel.name}</h2>
            <span className={adminBadgeClass(statusTone(channel.status))}>{channel.status}</span>
          </div>
          <p className="mt-1 font-mono text-2xs text-text-muted">{channel.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={statusRefreshing}
            onClick={() => void handleRefreshStatus()}
          >
            {statusRefreshing ? "Refreshing…" : "Refresh status"}
          </Button>
          <Button
            type="button"
            variant={isRunning ? "danger-soft" : "secondary"}
            size="sm"
            disabled={statusBusy}
            onClick={() => void handleToggleStream()}
          >
            {statusBusy ? "Working…" : isRunning ? "Stop stream" : "Start stream"}
          </Button>
          <Button
            type="button"
            variant="danger-soft"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
          <Button href="/tv-channels" variant="secondary" size="sm">
            Back
          </Button>
        </div>
      </div>

      {channel.status === "error" && channel.status_error ? (
        <AdminErrorAlert message={channel.status_error} />
      ) : null}

      <form onSubmit={(e) => void handleSave(e)} noValidate className="space-y-5">
        <AdminCard title="Live stream">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <th
                    scope="row"
                    className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                  >
                    Status
                  </th>
                  <td className="px-5 py-3 align-top">
                    <span className={adminBadgeClass(statusTone(channel.status))}>
                      {channel.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                  >
                    HLS playback URL
                  </th>
                  <td className="break-all px-5 py-3 align-top font-mono text-2xs text-text">
                    {channel.hls_playback_url || "Not started yet."}
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                  >
                    Updated
                  </th>
                  <td className="px-5 py-3 align-top text-text-muted">
                    {formatDate(channel.updated_at)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-2xs text-text-disabled">
            HLS playback URL and status are admin-only and set by the live restream service —
            never shown to viewers.
          </p>
        </AdminCard>

        <AdminCard title="Channel details">
          <div className="space-y-4">
            <label className="block">
              <span className={adminLabelClass}>Name</span>
              <input
                value={draft.name}
                onChange={(e) => patchDraft({ name: e.target.value })}
                className={adminInputClass}
                required
              />
            </label>

            <label className="block">
              <span className={adminLabelClass}>Description</span>
              <textarea
                value={draft.description}
                onChange={(e) => patchDraft({ description: e.target.value })}
                rows={3}
                className={`${adminInputClass} resize-y`}
                placeholder="Optional short description shown to viewers."
              />
            </label>

            <label className="block">
              <span className={adminLabelClass}>Source URL</span>
              <input
                value={draft.sourceUrl}
                onChange={(e) => patchDraft({ sourceUrl: e.target.value })}
                type="url"
                className={adminInputClass}
                required
              />
              <span className="mt-1.5 block text-2xs text-text-disabled">
                The origin HLS (.m3u8) source FFmpeg restreams from. Admin-only.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle
                checked={draft.isFree}
                onChange={(next) => patchDraft({ isFree: next })}
                label={draft.isFree ? "Free channel" : "Requires subscription"}
              />
              <Toggle
                checked={draft.isPublished}
                onChange={(next) => patchDraft({ isPublished: next })}
                label={draft.isPublished ? "Published" : "Unpublished"}
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Logo">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
              {logoUrl ? (
                <Image src={logoUrl} alt="" fill className="object-cover" sizes="80px" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xs text-text-disabled">
                  No logo
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-dashed border-border bg-bg px-3 py-4 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-border-hover"
              />
              <p className="mt-1.5 text-2xs text-text-disabled">
                JPG, PNG or WebP. Uploaded when you save changes.
              </p>
            </div>
          </div>
        </AdminCard>

        {saveError ? <p className="text-xs font-semibold text-warning">{saveError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" variant="success" loading={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

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
              Permanently delete <span className="font-bold text-text">{channel.name}</span>? If
              the stream is live it will be stopped first. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
