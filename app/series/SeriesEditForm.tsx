"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminSectionTabs } from "../components/AdminSectionTabs";
import { AdminSelect } from "../components/AdminSelect";
import { AdminDownloadImageButton } from "../components/AdminDownloadImageButton";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/ui/Button";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import { TrailerPreview } from "../components/TrailerPreview";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { useDeleteGenre, useGenres } from "../hooks/adminQueries";
import {
  listSeriesEpisodesApi,
  uploadEpisodeAssets,
  uploadEpisodeWithAssets,
  uploadSeriesAssets,
  type ApiSeasonRead,
} from "../lib/api";
import type { CatalogEntry, Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
import { mapApiSeasons } from "../lib/catalog";
import { fromIctDatetimeLocalValue, toIctDatetimeLocalValue } from "../lib/datetimeIct";
import { validateSeriesSeasons } from "../lib/seriesHelpers";
import { pickAssetFile, pickFileFromInput } from "../movie/movieEditHelpers";
import {
  formatMovieDate,
  movieEditInputClass,
  movieEditSelectClass,
  movieFileInputClass,
} from "../movie/movieDetailUi";
import { toSeriesDraft } from "./seriesEditHelpers";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function toApiStatus(status: Status) {
  return status.toLowerCase();
}

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

function ArtworkField({
  label,
  hint,
  previewUrl,
  currentKey,
  newFile,
  onFileChange,
  downloadFilename,
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  currentKey?: string | null;
  newFile: File | null;
  onFileChange: (file: File | null) => void;
  downloadFilename?: string;
}) {
  const isBanner = label === "Banner";
  const imgClass = isBanner ? "w-full" : "aspect-2/3 w-40 object-cover";
  const placeholderClass = isBanner ? "aspect-video w-full" : "aspect-2/3 w-40";

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="text-base font-bold tracking-[-0.02em]">{label}</div>
        {!newFile && previewUrl ? (
          <AdminDownloadImageButton
            url={previewUrl}
            filename={
              downloadFilename ||
              currentKey?.split("/").pop() ||
              `${label.toLowerCase()}.jpg`
            }
            label="Download"
          />
        ) : null}
      </div>
      <p className="mb-3 text-xs text-text-muted">{hint}</p>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`${label} preview`}
          className={`${imgClass} rounded-lg border border-border`}
        />
      ) : (
        <div
          className={`grid ${placeholderClass} place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-sm text-text-muted`}
        >
          No {label.toLowerCase()} uploaded
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className={movieFileInputClass}
        onChange={(e) => onFileChange(pickFileFromInput(e.target.files))}
      />
      {newFile ? (
        <p className="mt-2 break-all text-2xs text-text-muted">New file: {newFile.name}</p>
      ) : (
        <p className="mt-2 break-all text-2xs text-text-disabled">
          {currentKey || `No ${label.toLowerCase()} uploaded`}
        </p>
      )}
    </div>
  );
}

export function SeriesEditForm({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const { movies, isLoading, error, updateMovie, refreshMovies } = useMovieCatalog();
  const series = movies.find((item) => item.id === seriesId && item.type === "Series");

  const [editDraft, setEditDraft] = useState<Omit<CatalogEntry, "id"> | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressLabel, setUploadProgressLabel] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "media" | "episodes">("overview");
  const [prevSeriesId, setPrevSeriesId] = useState<string | null>(null);
  const [prevSeriesUpdatedAt, setPrevSeriesUpdatedAt] = useState<string | null>(null);

  if (series && (series.id !== prevSeriesId || series.updatedAt !== prevSeriesUpdatedAt)) {
    setPrevSeriesId(series.id);
    setPrevSeriesUpdatedAt(series.updatedAt ?? null);
    setEditDraft(structuredClone(toSeriesDraft(series)));
    setEditSaveError(null);
    setEditPosterFile(null);
    setEditBannerFile(null);
  }

  // Catalog list no longer embeds seasons — load them when opening edit.
  useEffect(() => {
    if (!series?.slug) return;
    let cancelled = false;
    void listSeriesEpisodesApi(series.slug)
      .then((apiSeasons: ApiSeasonRead[]) => {
        if (cancelled) return;
        const seasons = mapApiSeasons(apiSeasons);
        setEditDraft((prev) => (prev ? { ...prev, seasons } : prev));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Could not load episodes.");
      });
    return () => {
      cancelled = true;
    };
  }, [series?.slug, series?.updatedAt]);

  const { data: genreData } = useGenres();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => {
        if (editDraft) {
          patchDraft({ genre: formatGenres(parseGenresFromStored(editDraft.genre).filter((g) => g !== name)) });
        }
      },
      onError: () => toast.error("Could not delete genre"),
    });
  };

  const editPosterPreviewUrl = useMemo(
    () => (editPosterFile ? URL.createObjectURL(editPosterFile) : null),
    [editPosterFile],
  );
  const editBannerPreviewUrl = useMemo(
    () => (editBannerFile ? URL.createObjectURL(editBannerFile) : null),
    [editBannerFile],
  );
  const posterPreviewUrl = editPosterPreviewUrl ?? series?.posterUrl ?? null;
  const bannerPreviewUrl = editBannerPreviewUrl ?? series?.bannerUrl ?? null;

  const patchDraft = (patch: Partial<Omit<CatalogEntry, "id">>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    return () => {
      if (editPosterPreviewUrl) URL.revokeObjectURL(editPosterPreviewUrl);
    };
  }, [editPosterPreviewUrl]);

  useEffect(() => {
    return () => {
      if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);
    };
  }, [editBannerPreviewUrl]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!series || !editDraft || !series.slug) return;
    if (!editDraft.title.trim()) {
      const message = "Enter a title to save.";
      setEditSaveError(message);
      toast.error(message);
      return;
    }
    if (!editDraft.genre.trim()) {
      const message = "Select at least one genre.";
      setEditSaveError(message);
      toast.error(message);
      return;
    }

    if (!validateSeriesSeasons(editDraft.seasons)) {
      const message = "Series needs at least one season, and every episode needs a title.";
      setEditSaveError(message);
      toast.warning(message);
      return;
    }

    const priceResult = validateAdminPriceUsd(editDraft.price);
    if (!priceResult.ok) {
      setEditSaveError(priceResult.message);
      toast.error(priceResult.message);
      return;
    }

    if (editDraft.status === "Scheduled" && !editDraft.publishAt) {
      const message = "Pick a go-live date and time (Cambodia time) for Scheduled.";
      setEditSaveError(message);
      toast.error(message);
      return;
    }

    const isNewlyPublishing =
      editDraft.status === "Published" && series.status !== "Published";
    if (isNewlyPublishing) {
      const hasPoster =
        Boolean(series.posterKey) ||
        Boolean(editDraft.posterKey) ||
        Boolean(pickAssetFile(editPosterFile));
      if (!hasPoster) {
        const message = "A poster is required before publishing.";
        setEditSaveError(message);
        toast.error(message);
        setTab("media");
        return;
      }
    }

    const newEpisodes = editDraft.seasons.flatMap((season) =>
      season.episodes
        .filter((ep) => !ep.slug)
        .map((ep) => ({ seasonNumber: season.number, episode: ep })),
    );
    const newWithoutVideo = newEpisodes.filter(
      ({ episode }) => !(episode.videoFile instanceof File && episode.videoFile.size > 0),
    );
    if (newWithoutVideo.length > 0) {
      const labels = newWithoutVideo
        .map(({ seasonNumber, episode }) => `S${seasonNumber}E${episode.number}`)
        .join(", ");
      const message = `New episodes need a video file before saving: ${labels}`;
      setEditSaveError(message);
      toast.warning(message);
      setTab("episodes");
      return;
    }

    const posterFile = pickAssetFile(editPosterFile);
    const bannerFile = pickAssetFile(editBannerFile);

    setEditSaveError(null);
    setIsSaving(true);
    setUploadProgressLabel(null);
    try {
      const hasNewAssets = Boolean(posterFile || bannerFile);
      if (hasNewAssets) {
        setUploadProgressLabel("Uploading series artwork…");
        await uploadSeriesAssets(series.slug, { poster: posterFile, banner: bannerFile });
      }

      for (const { seasonNumber, episode } of newEpisodes) {
        const label = `S${seasonNumber}E${episode.number}`;
        setUploadProgressLabel(`Uploading new ${label} – ${episode.title}…`);
        await uploadEpisodeWithAssets(
          series.slug,
          {
            title: episode.title,
            seasonNumber,
            episodeNumber: episode.number,
            runtime: episode.runtime || undefined,
            status: toApiStatus(editDraft.status),
            isFree: Boolean(episode.isFree),
          },
          episode.videoFile!,
        );
      }

      const episodeAssetJobs = editDraft.seasons.flatMap((season) =>
        season.episodes
          .filter((ep) => Boolean(ep.slug) && ep.videoFile instanceof File && ep.videoFile.size > 0)
          .map((ep) => ({
            seasonNumber: season.number,
            episodeNumber: ep.number,
            episodeSlug: ep.slug!,
            video: ep.videoFile as File,
          })),
      );

      for (const job of episodeAssetJobs) {
        const label = `S${job.seasonNumber}E${job.episodeNumber}`;
        setUploadProgressLabel(`Uploading ${label} video…`);
        await uploadEpisodeAssets(series.slug, job.episodeSlug, {
          video: job.video,
        });
      }

      setUploadProgressLabel("Saving series…");
      await updateMovie(series.id, editDraft);
      if (hasNewAssets || episodeAssetJobs.length > 0 || newEpisodes.length > 0) {
        await refreshMovies();
      }
      toast.success(
        newEpisodes.length > 0
          ? `Series updated · ${newEpisodes.length} new episode${newEpisodes.length === 1 ? "" : "s"} uploaded`
          : "Series updated successfully",
      );
      router.push(`/series/${series.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setEditSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
      setUploadProgressLabel(null);
    }
  };

  if (isLoading || (series && !editDraft)) {
    return (
      <AdminCard title="Edit series">
        <InlineLoading label="Loading series" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Edit series">
        <p className="text-sm text-warning">{error}</p>
        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-3 text-xs font-bold text-brand hover:underline"
        >
          Retry
        </button>
      </AdminCard>
    );
  }

  if (!series || !editDraft) {
    return (
      <AdminCard title="Series not found">
        <p className="text-sm text-text-muted">This series is not in the admin catalog.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <BackButton href="/series" label="Back to series" size="md" />
          <BackButton href="/short-series" label="Back to short series" size="md" />
        </div>
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
    { key: "episodes", label: "Seasons & episodes" },
  ];

  const listHref = editDraft.isShortMovie ? "/short-series" : "/series";
  const noun = editDraft.isShortMovie ? "short series" : "series";

  return (
    <form onSubmit={saveEdit} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="pb-2">
            <BackButton href={listHref} label={`Back to ${noun}`} />
          </div>
          <AdminSectionTabs
            tabs={tabs}
            active={tab}
            onChange={(k) => setTab(k as "overview" | "media" | "episodes")}
            bare
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Button href={`/series/${series.id}`} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={isSaving}>
            {isSaving ? uploadProgressLabel || "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Active section */}
      <div>
          <div className={tab === "overview" ? "block" : "hidden"}>
            <div className="min-h-[calc(100vh-13rem)] rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  <EditRow label="English title">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.title}
                      onChange={(e) => patchDraft({ title: e.target.value })}
                      required
                    />
                  </EditRow>
                  <EditRow label="Khmer title">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.titleKm ?? ""}
                      onChange={(e) => patchDraft({ titleKm: e.target.value })}
                      placeholder="Optional"
                    />
                  </EditRow>
                  <EditRow label="Status">
                    <AdminSelect
                      className={movieEditSelectClass}
                      value={editDraft.status}
                      onChange={(v) => {
                        const next = v as Status;
                        patchDraft({
                          status: next,
                          publishAt: next === "Scheduled" ? editDraft.publishAt ?? null : null,
                        });
                      }}
                      options={statuses.map((s) => ({ value: s, label: s }))}
                      aria-label="Status"
                    />
                    <p className="mt-1 text-2xs text-text-disabled">
                      Published requires a poster. Scheduled goes live automatically (ICT).
                    </p>
                  </EditRow>
                  {editDraft.status === "Scheduled" ? (
                    <EditRow label="Go live (ICT)">
                      <input
                        type="datetime-local"
                        className={movieEditInputClass}
                        value={toIctDatetimeLocalValue(editDraft.publishAt)}
                        onChange={(e) =>
                          patchDraft({
                            publishAt: fromIctDatetimeLocalValue(e.target.value),
                          })
                        }
                        required
                      />
                      <p className="mt-1 text-2xs text-text-disabled">
                        Cambodia time (UTC+7). Publishes when a poster is ready — retries if
                        artwork is still missing.
                      </p>
                    </EditRow>
                  ) : null}
                  <EditRow label="Monthly price (USD)">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.price.replace(/^\$/, "")}
                      onChange={(e) =>
                        patchDraft({ price: e.target.value ? `$${e.target.value}` : "Free" })
                      }
                      placeholder="6.99"
                    />
                    <p className="mt-1 text-2xs text-text-disabled">{ADMIN_PRICE_HINT}</p>
                  </EditRow>
                  <EditRow label="Catalog type">
                    <AdminSelect
                      className={movieEditSelectClass}
                      value={editDraft.isShortMovie ? "short" : "series"}
                      onChange={(v) => patchDraft({ isShortMovie: v === "short" })}
                      options={[
                        { value: "series", label: "Series" },
                        { value: "short", label: "Short series" },
                      ]}
                      aria-label="Catalog type"
                    />
                    <p className="mt-1 text-2xs text-text-disabled">
                      Short series appear in the short-form / vertical catalog.
                    </p>
                  </EditRow>
                  <EditRow label="Rating">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.rating === "-" ? "" : editDraft.rating}
                      onChange={(e) => patchDraft({ rating: e.target.value || "-" })}
                      placeholder="8.7"
                    />
                  </EditRow>
                  <EditRow label="Release year">
                    <input
                      className={movieEditInputClass}
                      type="number"
                      min={1900}
                      max={2100}
                      value={editDraft.releaseYear ?? ""}
                      onChange={(e) =>
                        patchDraft({
                          releaseYear: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </EditRow>
                  <EditRow label="Genres">
                    <GenreMultiSelect
                      selected={parseGenresFromStored(editDraft.genre)}
                      onChange={(next) => patchDraft({ genre: formatGenres(next) })}
                      options={genreOptions}
                      onDeleteGenre={handleDeleteGenre}
                    />
                  </EditRow>
                  <EditRow label="Updated">
                    <span className="font-semibold text-text">
                      {formatMovieDate(series.updatedAt)}
                    </span>
                  </EditRow>
                  <EditRow label="Description">
                    <textarea
                      className={`${movieEditInputClass} min-h-20 resize-y font-normal`}
                      value={editDraft.description ?? ""}
                      onChange={(e) => patchDraft({ description: e.target.value || null })}
                      placeholder="Brief synopsis shown on the series page…"
                    />
                  </EditRow>
                </tbody>
              </table>
            </div>
          </div>

          <div className={tab === "media" ? "block" : "hidden"}>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ArtworkField
                  label="Poster"
                  hint="Portrait key art shown on series cards."
                  previewUrl={posterPreviewUrl}
                  currentKey={series.posterKey}
                  newFile={editPosterFile}
                  onFileChange={setEditPosterFile}
                  downloadFilename={
                    series.posterKey?.split("/").pop() ||
                    `${series.slug || series.id}-poster.jpg`
                  }
                />
                <ArtworkField
                  label="Banner"
                  hint="Wide cinematic image used on the home page hero."
                  previewUrl={bannerPreviewUrl}
                  currentKey={series.bannerKey}
                  newFile={editBannerFile}
                  onFileChange={setEditBannerFile}
                  downloadFilename={
                    series.bannerKey?.split("/").pop() ||
                    `${series.slug || series.id}-banner.jpg`
                  }
                />
                <div className="rounded-lg border border-border bg-bg p-4">
                  <div className="mb-1 text-base font-bold tracking-[-0.02em]">Trailer</div>
                  <p className="mb-3 text-xs text-text-muted">Paste a YouTube URL.</p>
                  <input
                    className={movieEditInputClass}
                    type="url"
                    value={editDraft.trailerUrl ?? ""}
                    onChange={(e) => patchDraft({ trailerUrl: e.target.value || null })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <TrailerPreview url={editDraft.trailerUrl ?? ""} />
                </div>
              </div>
            </div>
          </div>

          <div className={tab === "episodes" ? "block" : "hidden"}>
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold tracking-[-0.02em]">Seasons</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Expand a season to see its episodes. Edit an episode to change title, assets,
                    or free access.
                  </p>
                </div>
                <p className="text-2xs font-semibold tabular-nums text-text-disabled">
                  {editDraft.seasons.reduce((n, s) => n + s.episodes.length, 0)} episodes ·{" "}
                  {editDraft.seasons.length} season{editDraft.seasons.length === 1 ? "" : "s"}
                </p>
              </div>
              <SeasonsEpisodesEditor
                seasons={editDraft.seasons}
                onChange={(next) => patchDraft({ seasons: next })}
                allowAssetReplace
              />
            </div>
          </div>
      </div>

      {editSaveError ? (
        <p className="text-xs font-semibold text-warning">{editSaveError}</p>
      ) : null}
    </form>
  );
}
