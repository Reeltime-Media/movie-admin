"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminSectionTabs } from "../components/AdminSectionTabs";
import { AdminSelect } from "../components/AdminSelect";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import { TrailerPreview } from "../components/TrailerPreview";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { useDeleteGenre, useGenres } from "../hooks/adminQueries";
import { uploadSeriesAssets } from "../lib/api";
import type { CatalogEntry, Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
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
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  currentKey?: string | null;
  newFile: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const isBanner = label === "Banner";
  const imgClass = isBanner ? "w-full" : "aspect-2/3 w-40 object-cover";
  const placeholderClass = isBanner ? "aspect-video w-full" : "aspect-2/3 w-40";

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="mb-1 text-[14px] font-bold tracking-[-0.02em]">{label}</div>
      <p className="mb-3 text-[12px] text-text-muted">{hint}</p>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${label} preview`}
          className={`${imgClass} rounded-lg border border-border`}
        />
      ) : (
        <div
          className={`grid ${placeholderClass} place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted`}
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
        <p className="mt-2 break-all text-[11px] text-text-muted">New file: {newFile.name}</p>
      ) : (
        <p className="mt-2 break-all text-[11px] text-text-disabled">
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
    if (!editDraft.title.trim()) return;
    if (!editDraft.genre.trim()) return;

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

    const posterFile = pickAssetFile(editPosterFile);
    const bannerFile = pickAssetFile(editBannerFile);

    setEditSaveError(null);
    setIsSaving(true);
    try {
      const hasNewAssets = Boolean(posterFile || bannerFile);
      if (hasNewAssets) {
        await uploadSeriesAssets(series.slug, { poster: posterFile, banner: bannerFile });
      }

      await updateMovie(series.id, editDraft);
      if (hasNewAssets) {
        await refreshMovies();
      }
      toast.success("Series updated successfully");
      router.push(`/series/${series.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setEditSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
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
        <p className="text-[13px] text-warning">{error}</p>
        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-3 text-[12px] font-bold text-brand hover:underline"
        >
          Retry
        </button>
      </AdminCard>
    );
  }

  if (!series || !editDraft) {
    return (
      <AdminCard title="Series not found">
        <p className="text-[13px] text-text-muted">This series is not in the admin catalog.</p>
        <Link
          href="/series"
          className="mt-4 inline-flex rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to series
        </Link>
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
    { key: "episodes", label: "Episodes" },
  ];

  return (
    <form onSubmit={saveEdit} className="space-y-5">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <AdminSectionTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as "overview" | "media" | "episodes")}
          bare
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Link
            href={`/series/${series.id}`}
            className="rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Active section */}
      <div>
          <div className={tab === "overview" ? "block" : "hidden"}>
            <div className="min-h-[calc(100vh-13rem)] rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-border">
                  <EditRow label="Title">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.title}
                      onChange={(e) => patchDraft({ title: e.target.value })}
                      required
                    />
                  </EditRow>
                  <EditRow label="Status">
                    <AdminSelect
                      className={movieEditSelectClass}
                      value={editDraft.status}
                      onChange={(v) => patchDraft({ status: v as Status })}
                      options={statuses.map((s) => ({ value: s, label: s }))}
                      aria-label="Status"
                    />
                  </EditRow>
                  <EditRow label="Monthly price (USD)">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.price.replace(/^\$/, "")}
                      onChange={(e) =>
                        patchDraft({ price: e.target.value ? `$${e.target.value}` : "Free" })
                      }
                      placeholder="6.99"
                    />
                    <p className="mt-1 text-[11px] text-text-disabled">{ADMIN_PRICE_HINT}</p>
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
                />
                <ArtworkField
                  label="Banner"
                  hint="Wide cinematic image used on the home page hero."
                  previewUrl={bannerPreviewUrl}
                  currentKey={series.bannerKey}
                  newFile={editBannerFile}
                  onFileChange={setEditBannerFile}
                />
                <div className="rounded-lg border border-border bg-bg p-4">
                  <div className="mb-1 text-[14px] font-bold tracking-[-0.02em]">Trailer</div>
                  <p className="mb-3 text-[12px] text-text-muted">Paste a YouTube URL.</p>
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
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="mb-1 text-[14px] font-bold tracking-[-0.02em]">Seasons and episodes</h3>
              <p className="mb-5 text-[13px] text-text-muted">
                Edit season and episode metadata. Episode video uploads are managed when creating a
                series or from the series detail page.
              </p>
              <SeasonsEpisodesEditor
                seasons={editDraft.seasons}
                onChange={(next) => patchDraft({ seasons: next })}
              />
            </div>
          </div>
      </div>

      {editSaveError ? (
        <p className="text-[12px] font-semibold text-warning">{editSaveError}</p>
      ) : null}
    </form>
  );
}
