"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminSelect } from "../components/AdminSelect";
import { InlineLoading } from "../components/InlineLoading";
import { Button } from "../components/ui/Button";
import { useAdminPodcast } from "../hooks/adminQueries";
import type { Status } from "../lib/adminData";
import { updateAdminPodcast, uploadAdminPodcastAssets } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { runtimeMinutesFromApi } from "../lib/runtime";
import {
  PODCAST_ACCESS_OPTIONS,
  detectAudioDurationMinutes,
  formatRuntimeMinutes,
  isFreeFromPodcastAccess,
  podcastAccessFromIsFree,
  podcastFileInputClass,
  podcastSelectClass,
  podcastTextInputClass,
  toApiStatus,
  toUiStatus,
  validatePodcastPublishReady,
  type PodcastAccess,
} from "./podcastUi";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
      >
        {label}
      </th>
      <td className="px-5 py-3 align-top">{children}</td>
    </tr>
  );
}

export function PodcastEditForm({ podcastId }: { podcastId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: podcast, isLoading, error: queryError, refetch } = useAdminPodcast(podcastId);

  const [title, setTitle] = useState("");
  const [titleKm, setTitleKm] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<PodcastAccess>("plan");
  const [status, setStatus] = useState<Status>("Draft");
  const [detectedRuntime, setDetectedRuntime] = useState<number | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  if (podcast && podcast.id !== hydratedId) {
    setHydratedId(podcast.id);
    setTitle(podcast.title);
    setTitleKm(podcast.title_km ?? "");
    setDescription(podcast.description ?? "");
    setAccess(podcastAccessFromIsFree(Boolean(podcast.is_free)));
    setStatus(toUiStatus(podcast.status));
    setDetectedRuntime(null);
    setPosterFile(null);
    setAudioFile(null);
    setUploadProgress(null);
    setSaveError(null);
  }

  const posterPreviewUrl = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : null),
    [posterFile],
  );
  const audioPreviewUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : null),
    [audioFile],
  );

  useEffect(() => {
    return () => {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [posterPreviewUrl]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const coverUrl = posterPreviewUrl ?? mediaUrl(podcast?.poster_key, podcast?.updated_at);
  const audioUrl = audioPreviewUrl ?? mediaUrl(podcast?.audio_key, podcast?.updated_at);
  const storedRuntime = podcast ? runtimeMinutesFromApi(podcast) : null;
  const runtimeLabel = formatRuntimeMinutes(detectedRuntime ?? storedRuntime);

  const handlePosterChange = async (file: File | null) => {
    if (!podcast || !file) {
      setPosterFile(null);
      return;
    }
    setPosterFile(file);
    setIsUploadingPoster(true);
    try {
      await uploadAdminPodcastAssets(podcast.id, { poster: file });
      await refetch();
      setPosterFile(null);
      void queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast.success("Cover updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload cover");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAudioChange = async (file: File | null) => {
    setAudioFile(file);
    if (!file || file.size === 0) {
      setDetectedRuntime(null);
      return;
    }
    const minutes = await detectAudioDurationMinutes(file);
    setDetectedRuntime(minutes ?? null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podcast) return;
    if (!title.trim()) {
      setSaveError("Enter a title.");
      return;
    }

    const isNewlyPublishing = status === "Published" && toUiStatus(podcast.status) !== "Published";
    if (isNewlyPublishing) {
      const publishCheck = validatePodcastPublishReady(
        { poster_key: podcast.poster_key, audio_key: podcast.audio_key },
        { audioFile },
      );
      if (!publishCheck.ok) {
        setSaveError(publishCheck.message);
        toast.warning(publishCheck.message);
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      let runtimeMinutes: number | null | undefined = undefined;
      if (audioFile) {
        setUploadProgress(0);
        await uploadAdminPodcastAssets(podcast.id, { audio: audioFile }, setUploadProgress);
        runtimeMinutes =
          detectedRuntime ?? (await detectAudioDurationMinutes(audioFile)) ?? null;
      }

      await updateAdminPodcast(podcast.id, {
        title: title.trim(),
        titleKm: titleKm.trim() || null,
        description: description.trim() || null,
        ...(runtimeMinutes !== undefined ? { runtimeMinutes } : {}),
        status: toApiStatus(status),
        isFree: isFreeFromPodcastAccess(access),
      });

      void queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast", podcast.id] });
      toast.success("Podcast saved");
      router.push(`/podcast/${podcast.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save podcast";
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  if (isLoading) {
    return (
      <AdminCard title="Edit podcast">
        <InlineLoading label="Loading podcast" />
      </AdminCard>
    );
  }

  if (queryError || !podcast) {
    return (
      <AdminCard title="Podcast not found">
        <p className="text-sm text-text-muted">
          {queryError instanceof Error ? queryError.message : "This podcast was not found."}
        </p>
        <Button href="/podcast" variant="secondary" className="mt-4">
          Back to podcasts
        </Button>
      </AdminCard>
    );
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button href={`/podcast/${podcast.id}`} variant="secondary" size="sm">
          Back to detail
        </Button>
        <Button type="submit" size="sm" loading={isSaving} disabled={isSaving || isUploadingPoster}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <AdminCard title="Cover">
          <div className="relative mx-auto aspect-square w-full max-w-52 overflow-hidden rounded-xl bg-surface-elevated">
            {coverUrl ? (
              <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-text-disabled">
                No cover
              </div>
            )}
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-text-muted">
              {isUploadingPoster ? "Uploading…" : "Replace cover"}
            </span>
            <input
              type="file"
              accept="image/*"
              className={podcastFileInputClass}
              disabled={isUploadingPoster || isSaving}
              onChange={(e) => void handlePosterChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </AdminCard>

        <AdminCard title="Details">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                <EditRow label="English title">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={podcastTextInputClass}
                  />
                </EditRow>
                <EditRow label="Khmer title">
                  <input
                    value={titleKm}
                    onChange={(e) => setTitleKm(e.target.value)}
                    className={podcastTextInputClass}
                  />
                </EditRow>
                <EditRow label="Status">
                  <AdminSelect
                    value={status}
                    onChange={(v) => setStatus(v as Status)}
                    options={statuses.map((s) => ({ value: s, label: s }))}
                    className={podcastSelectClass}
                    aria-label="Status"
                  />
                </EditRow>
                <EditRow label="Access">
                  <AdminSelect
                    value={access}
                    onChange={(v) => setAccess(v as PodcastAccess)}
                    options={[...PODCAST_ACCESS_OPTIONS]}
                    className={podcastSelectClass}
                    aria-label="Access"
                  />
                  <span className="mt-1.5 block text-2xs text-text-disabled">
                    {access === "free"
                      ? "Anyone can listen without a subscription."
                      : "Unlocks with any active subscription plan."}
                  </span>
                </EditRow>
                <EditRow label="Runtime">
                  <span className="text-sm text-text">
                    {runtimeLabel ?? "Detected from audio when uploaded"}
                  </span>
                </EditRow>
                <EditRow label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className={`${podcastTextInputClass} resize-y`}
                  />
                </EditRow>
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Audio">
        {audioUrl ? (
          <audio controls src={audioUrl} className="mb-4 w-full" preload="metadata">
            Your browser does not support audio playback.
          </audio>
        ) : (
          <p className="mb-4 text-sm text-text-muted">No audio uploaded yet.</p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-muted">Replace audio</span>
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac,audio/*"
            className={podcastFileInputClass}
            disabled={isSaving}
            onChange={(e) => void handleAudioChange(e.target.files?.[0] ?? null)}
          />
          {detectedRuntime != null ? (
            <span className="mt-1.5 block text-2xs text-text-disabled">
              Detected runtime: {formatRuntimeMinutes(detectedRuntime)}
            </span>
          ) : null}
        </label>
        {uploadProgress != null ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>Uploading audio…</span>
              <span className="tabular-nums">{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : null}
      </AdminCard>

      {saveError ? <p className="text-xs font-semibold text-warning">{saveError}</p> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button href={`/podcast/${podcast.id}`} variant="secondary">
          Cancel
        </Button>
        <Button type="submit" loading={isSaving} disabled={isSaving || isUploadingPoster}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
