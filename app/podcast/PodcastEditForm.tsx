"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminSelect } from "../components/AdminSelect";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { Button } from "../components/ui/Button";
import { useAdminPodcast, useDeleteGenre, useGenres } from "../hooks/adminQueries";
import type { Status } from "../lib/adminData";
import { updateAdminPodcast, uploadAdminPodcastAssets } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { runtimeMinutesFromApi } from "../lib/runtime";
import {
  podcastFileInputClass,
  podcastSelectClass,
  podcastTextInputClass,
  toApiStatus,
  toUiStatus,
  validatePodcastPublishReady,
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
  const [genres, setGenres] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [status, setStatus] = useState<Status>("Draft");
  const [releaseYear, setReleaseYear] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  const { data: genreData } = useGenres();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  if (podcast && podcast.id !== hydratedId) {
    setHydratedId(podcast.id);
    setTitle(podcast.title);
    setTitleKm(podcast.title_km ?? "");
    setDescription(podcast.description ?? "");
    setGenres(podcast.genres ?? []);
    setIsFree(Boolean(podcast.is_free));
    setStatus(toUiStatus(podcast.status));
    setReleaseYear(podcast.release_year != null ? String(podcast.release_year) : "");
    const minutes = runtimeMinutesFromApi(podcast);
    setRuntimeMinutes(minutes != null ? String(minutes) : "");
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

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => setGenres((prev) => prev.filter((g) => g !== name)),
      onError: () => toast.error("Could not delete genre"),
    });
  };

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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podcast) return;
    if (!title.trim()) {
      setSaveError("Enter a title.");
      return;
    }
    if (genres.length === 0) {
      setSaveError("Select at least one genre.");
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
      if (audioFile) {
        setUploadProgress(0);
        await uploadAdminPodcastAssets(podcast.id, { audio: audioFile }, setUploadProgress);
      }

      const yearRaw = releaseYear.trim();
      const year = yearRaw ? Number(yearRaw) : null;
      const runtimeRaw = runtimeMinutes.trim();
      const runtime = runtimeRaw ? Number(runtimeRaw) : null;

      await updateAdminPodcast(podcast.id, {
        title: title.trim(),
        titleKm: titleKm.trim() || null,
        description: description.trim() || null,
        genres,
        runtimeMinutes: runtime != null && Number.isFinite(runtime) && runtime > 0 ? Math.round(runtime) : null,
        releaseYear: year != null && Number.isFinite(year) ? year : null,
        status: toApiStatus(status),
        isFree,
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
                <EditRow label="Genres">
                  <GenreMultiSelect
                    selected={genres}
                    onChange={setGenres}
                    options={genreOptions}
                    onDeleteGenre={handleDeleteGenre}
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
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isFree}
                    onClick={() => setIsFree((v) => !v)}
                    className="group flex items-center gap-3"
                  >
                    <span
                      className={[
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                        isFree ? "bg-success" : "bg-text-disabled/30",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                          isFree ? "translate-x-5" : "translate-x-0",
                        ].join(" ")}
                      />
                    </span>
                    <span className="text-left">
                      <span className="block text-xs font-semibold text-text">
                        {isFree ? "Free podcast" : "Included with Plan"}
                      </span>
                      <span className="mt-0.5 block text-2xs text-text-disabled">
                        {isFree
                          ? "Anyone can listen without a subscription."
                          : "Unlocks with any active subscription plan."}
                      </span>
                    </span>
                  </button>
                </EditRow>
                <EditRow label="Release year">
                  <input
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    type="number"
                    min={1900}
                    max={2100}
                    className={podcastTextInputClass}
                  />
                </EditRow>
                <EditRow label="Runtime (minutes)">
                  <input
                    value={runtimeMinutes}
                    onChange={(e) => setRuntimeMinutes(e.target.value)}
                    type="number"
                    min={0}
                    step={1}
                    className={podcastTextInputClass}
                  />
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
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
          />
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
