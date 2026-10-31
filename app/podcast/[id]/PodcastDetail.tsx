"use client";

import Image from "next/image";
import { AdminCard } from "../../components/AdminCard";
import { BackButton } from "../../components/BackButton";
import { InlineLoading } from "../../components/InlineLoading";
import { Button } from "../../components/ui/Button";
import { useAdminPodcast } from "../../hooks/adminQueries";
import { statusClasses } from "../../lib/adminData";
import { mediaUrl } from "../../lib/media";
import { formatPodcastDate, toUiStatus } from "../podcastUi";

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
      >
        {label}
      </th>
      <td className="px-5 py-3 align-top text-text">{value || "—"}</td>
    </tr>
  );
}

export function PodcastDetail({ podcastId }: { podcastId: string }) {
  const { data: podcast, isLoading, error: queryError, refetch } = useAdminPodcast(podcastId);
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load podcast detail"
    : null;

  if (isLoading) {
    return (
      <AdminCard title="Podcast detail">
        <InlineLoading label="Loading podcast detail" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <p>{error}</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 font-semibold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!podcast) {
    return (
      <AdminCard title="Podcast not found">
        <p className="text-sm text-text-muted">This podcast was not found.</p>
        <BackButton href="/podcast" label="Back to podcasts" className="mt-4" size="md" />
      </AdminCard>
    );
  }

  const uiStatus = toUiStatus(podcast.status);
  const posterUrl = mediaUrl(podcast.poster_key, podcast.updated_at);
  const audioUrl = mediaUrl(podcast.audio_key, podcast.updated_at);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton href="/podcast" label="Back to podcasts" />
        <Button href={`/podcast/${podcast.id}/edit`} size="sm">
          Edit podcast
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <AdminCard title="Cover">
          <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-xl bg-surface-elevated">
            {posterUrl ? (
              <Image src={posterUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-text-disabled">
                No cover
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Overview">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                <InfoRow label="English title" value={podcast.title} />
                <InfoRow label="Khmer title" value={podcast.title_km} />
                <InfoRow label="Slug" value={podcast.slug} />
                <InfoRow
                  label="Access"
                  value={podcast.is_free ? "Free" : "Included with Plan"}
                />
                <InfoRow label="Runtime" value={podcast.runtime} />
                <tr>
                  <th
                    scope="row"
                    className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                  >
                    Status
                  </th>
                  <td className="px-5 py-3 align-top">
                    <span className={statusClasses(uiStatus)}>{uiStatus}</span>
                  </td>
                </tr>
                <InfoRow label="Audio" value={podcast.audio_key ? "Ready" : "Missing"} />
                <InfoRow label="Updated" value={formatPodcastDate(podcast.updated_at)} />
                <InfoRow label="Description" value={podcast.description} />
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Audio preview">
        {audioUrl ? (
          <audio controls src={audioUrl} className="w-full" preload="metadata">
            Your browser does not support audio playback.
          </audio>
        ) : (
          <p className="text-sm text-text-muted">No audio uploaded yet.</p>
        )}
      </AdminCard>
    </div>
  );
}
