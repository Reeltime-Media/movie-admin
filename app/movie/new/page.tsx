"use client";

import { Film, ImageIcon, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";
import { AssetPicker } from "../../components/AssetPicker";
import { BackButton } from "../../components/BackButton";
import { Button } from "../../components/ui/Button";
import { AdminSelect } from "../../components/AdminSelect";
import { GenreMultiSelect } from "../../components/GenreMultiSelect";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import { WizardSteps } from "../../components/WizardSteps";
import { useCreateGenre, useDeleteGenre, useGenres } from "../../hooks/adminQueries";
import type { Status } from "../../lib/adminData";
import {
  completeMovieUpload,
  createAdminMovieDraft,
  startMovieUpload,
  uploadAdminMovieAsset,
  uploadFileToPresignedUrl,
  uploadMovieVideoMultipart,
} from "../../lib/api";
import { imageContentType } from "../../lib/media";
import { useUploadProgress } from "../../components/UploadProgressContext";
import { fromIctDatetimeLocalValue } from "../../lib/datetimeIct";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../../lib/money";
import { validateMoviePublishReady } from "../../lib/moviePublish";
import { parseRuntimeMinutesInput } from "../../lib/runtime";
import { REGION_OPTIONS } from "../../lib/regions";

const textInputClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand/50 focus:bg-surface";

const selectClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition-colors hover:border-border-hover focus:border-brand/50 focus:bg-surface";

const stepLabels = ["Details", "Assets"] as const;

function parseStatus(s: string): Status {
  if (s === "Published" || s === "Draft" || s === "Scheduled" || s === "Review") return s;
  return "Draft";
}

function toApiStatus(status: Status) {
  return status.toLowerCase();
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

export default function NewMoviePage() {
  const router = useRouter();
  const { refreshMovies } = useMovieCatalog();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Published");
  const [publishAtLocal, setPublishAtLocal] = useState("");
  const [region, setRegion] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [showNewGenre, setShowNewGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const { data: genreData } = useGenres();
  const createGenreMutation = useCreateGenre();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => setGenres((prev) => prev.filter((g) => g !== name)),
      onError: () => toast.error("Could not delete genre"),
    });
  };
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { jobs, startJob, updateJob, setJobLabel, finishJob, failJob } = useUploadProgress();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleAddGenre = async () => {
    const name = newGenreName.trim();
    if (!name) return;
    try {
      const created = await createGenreMutation.mutateAsync(name);
      setGenres((prev) => [...prev, created.name]);
      setNewGenreName("");
      setShowNewGenre(false);
    } catch {
      toast.error("Could not create genre");
    }
  };

  const goToStep = (next: number) => {
    setDetailsError(null);
    setSubmitError(null);
    setStep(next);
  };

  const failValidation = (message: string, targetStep: 0 | 1) => {
    if (targetStep === 0) {
      setDetailsError(message);
      setSubmitError(null);
    } else {
      setSubmitError(message);
      setDetailsError(null);
    }
    setStep(targetStep);
    toast.warning(message);
  };

  const readCommonFields = (fd: FormData) => {
    const title = String(fd.get("title") || "").trim();
    if (!title) {
      return { ok: false as const, message: "Enter a title to save." };
    }

    const priceResult = validateAdminPriceUsd(String(fd.get("price") || "0"));
    if (!priceResult.ok) {
      return { ok: false as const, message: priceResult.message };
    }

    const runtimeResult = parseRuntimeMinutesInput(fd.get("runtimeMinutes"));
    if (!runtimeResult.ok) {
      return { ok: false as const, message: runtimeResult.message };
    }

    return {
      ok: true as const,
      title,
      titleKm: String(fd.get("titleKm") || "").trim(),
      region: String(fd.get("region") || "").trim(),
      genres,
      priceUsd: priceResult.value,
      runtimeMinutes: runtimeResult.value,
      description: String(fd.get("description") || "").trim(),
      releaseYear: parseOptionalNumber(fd.get("releaseYear")),
      rating: String(fd.get("rating") || "").trim(),
      trailerUrl: String(fd.get("trailerUrl") || "").trim(),
    };
  };

  const uploadPosterForMovie = async (movieId: string, poster: File) => {
    await uploadAdminMovieAsset(movieId, "poster", poster);
  };

  const uploadBannerForMovie = async (movieId: string, banner: File) => {
    await uploadAdminMovieAsset(movieId, "banner", banner);
  };

  const getWizardForm = () =>
    document.getElementById("movie-wizard-form") as HTMLFormElement | null;

  const saveDraftFromForm = async (fd: FormData) => {
    const fields = readCommonFields(fd);
    if (!fields.ok) {
      failValidation(fields.message, 0);
      return;
    }

    const posterFile = fd.get("poster");
    const bannerFile = fd.get("banner");
    const poster = posterFile instanceof File && posterFile.size > 0 ? posterFile : null;
    const banner = bannerFile instanceof File && bannerFile.size > 0 ? bannerFile : null;

    setSubmitError(null);
    setDetailsError(null);
    setIsSubmitting(true);

    try {
      const created = await createAdminMovieDraft({
        title: fields.title,
        titleKm: fields.titleKm || null,
        region: fields.region || null,
        description: fields.description || undefined,
        genres: fields.genres,
        releaseYear: fields.releaseYear,
        rating: fields.rating || undefined,
        runtimeMinutes: fields.runtimeMinutes,
        priceUsd: fields.priceUsd,
        trailerUrl: fields.trailerUrl || undefined,
      });

      if (poster) {
        await uploadPosterForMovie(created.id, poster);
      }

      if (banner) {
        await uploadBannerForMovie(created.id, banner);
      }

      await refreshMovies();
      toast.success("Draft saved");
      router.push("/movie");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save draft";
      if (step === 0) {
        setDetailsError(message);
        setSubmitError(null);
      } else {
        setSubmitError(message);
        setDetailsError(null);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runWizardAction = async (intent: "draft" | "upload") => {
    const form = getWizardForm();
    if (!form) return;
    const fd = new FormData(form);

    const fields = readCommonFields(fd);
    if (!fields.ok) {
      failValidation(fields.message, 0);
      return;
    }

    const videoFile = fd.get("video");
    const posterFile = fd.get("poster");
    const bannerFile = fd.get("banner");
    const video = videoFile instanceof File && videoFile.size > 0 ? videoFile : null;
    const posterImage = posterFile instanceof File && posterFile.size > 0 ? posterFile : null;
    const bannerImage = bannerFile instanceof File && bannerFile.size > 0 ? bannerFile : null;

    if (intent === "draft") {
      if (video) {
        await uploadMovieWithStatus(fd, fields, video, posterImage, bannerImage, "Draft");
      } else {
        await saveDraftFromForm(fd);
      }
      return;
    }

    if (genres.length === 0) {
      failValidation("Select at least one genre.", 0);
      return;
    }

    setSubmitError(null);
    setDetailsError(null);

    const status: Status = parseStatus(String(fd.get("status")));
    const publishAt =
      status === "Scheduled" ? fromIctDatetimeLocalValue(publishAtLocal) : null;
    if (status === "Scheduled" && !publishAt) {
      failValidation("Pick a go-live date and time (Cambodia time) for Scheduled.", 0);
      return;
    }

    if (status === "Published") {
      const publishCheck = validateMoviePublishReady(
        { posterKey: null, hlsMasterKey: null, transcodeStatus: undefined },
        { posterFile: posterImage, videoFile: video },
      );
      if (!publishCheck.ok) {
        failValidation(publishCheck.message, 1);
        return;
      }
    } else if (!video) {
      failValidation("Choose a movie video file before uploading.", 1);
      return;
    }

    await uploadMovieWithStatus(
      fd,
      fields,
      video!,
      posterImage,
      bannerImage,
      status,
      publishAt,
    );
  };

  const handleSaveDraftClick = () => {
    void runWizardAction("draft");
  };

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Enter on Details just moves forward — required fields are checked on Upload.
    if (step !== 1) {
      goToStep(1);
      return;
    }
    void runWizardAction("upload");
  };

  const uploadMovieWithStatus = async (
    _fd: FormData,
    fields: Extract<ReturnType<typeof readCommonFields>, { ok: true }>,
    video: File,
    posterImage: File | null,
    bannerImage: File | null,
    status: Status,
    publishAt: string | null = null,
  ) => {
    const movieJobId = `movie-${fields.title}-${Date.now()}`;
    setActiveJobId(movieJobId);
    startJob(movieJobId, fields.title, "Starting upload…");
    setIsSubmitting(true);
    setSubmitError(null);
    setDetailsError(null);
    router.push("/movie");

    const successMessage =
      status === "Draft" ? "Draft saved with video" : "Movie uploaded successfully";

    void (async () => {
      try {
        const upload = await startMovieUpload({
          title: fields.title,
          fileSizeBytes: video.size,
          videoContentType: video.type || "video/mp4",
          posterContentType: posterImage ? imageContentType(posterImage) : undefined,
          bannerContentType: bannerImage ? imageContentType(bannerImage) : undefined,
        });

        if (posterImage && upload.poster_upload_url) {
          setJobLabel(movieJobId, "Uploading poster…");
          await uploadFileToPresignedUrl(upload.poster_upload_url, posterImage);
        }

        if (bannerImage && upload.banner_upload_url) {
          setJobLabel(movieJobId, "Uploading banner…");
          await uploadFileToPresignedUrl(upload.banner_upload_url, bannerImage);
        }

        setJobLabel(movieJobId, "Uploading video…");
        const parts = await uploadMovieVideoMultipart(
          video,
          {
            partSize: upload.part_size,
            partUrls: upload.part_urls,
          },
          (pct) => updateJob(movieJobId, pct),
        );

        setJobLabel(movieJobId, "Saving…");
        await completeMovieUpload({
          contentId: upload.content_id,
          slug: upload.slug,
          sourceKey: upload.source_key,
          uploadId: upload.upload_id,
          parts,
          title: fields.title,
          titleKm: fields.titleKm || null,
          region: fields.region || null,
          priceUsd: fields.priceUsd,
          description: fields.description,
          genres: fields.genres,
          releaseYear: fields.releaseYear,
          rating: fields.rating,
          runtimeMinutes: fields.runtimeMinutes,
          status: toApiStatus(status),
          publishAt: status === "Scheduled" ? publishAt : null,
          posterKey: upload.poster_key,
          bannerKey: upload.banner_key,
          trailerUrl: fields.trailerUrl,
        });

        finishJob(movieJobId);
        await refreshMovies();
        toast.success(successMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        failJob(movieJobId, message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const currentJob = activeJobId ? (jobs.find((j) => j.id === activeJobId) ?? null) : null;

  return (
    <AdminShell title="Upload new movie">
      <WizardSteps
        labels={stepLabels}
        step={step}
        onStepChange={goToStep}
        leading={<BackButton href="/movie" label="Back to movies" />}
      />

      <form id="movie-wizard-form" onSubmit={handleUploadSubmit} noValidate className="w-full space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title="Movie details">
            <p className="mb-5 text-sm text-text-muted">
              Set the title, genres, and listing fields first. You can save a draft anytime, or
              continue to attach poster, banner, and video.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English title">
                <input name="title" placeholder="The Last Drive" className={textInputClass} />
              </Field>
              <Field label="Khmer title">
                <input name="titleKm" placeholder="Optional" className={textInputClass} />
              </Field>

              <Field label="Region" hint="Optional.">
                <AdminSelect
                  value={region}
                  onChange={setRegion}
                  options={[{ value: "", label: "None" }, ...REGION_OPTIONS]}
                  className={selectClass}
                  aria-label="Region"
                />
                <input type="hidden" name="region" value={region} />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
                    Genres
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewGenre((v) => !v);
                      setNewGenreName("");
                    }}
                    className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2 py-1 text-2xs font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                  >
                    New genre
                  </button>
                </div>
                {showNewGenre ? (
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddGenre();
                        }
                      }}
                      placeholder="Genre name"
                      className={textInputClass}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void handleAddGenre()}
                      disabled={createGenreMutation.isPending || !newGenreName.trim()}
                    >
                      {createGenreMutation.isPending ? "Adding…" : "Add"}
                    </Button>
                  </div>
                ) : null}
                <GenreMultiSelect
                  selected={genres}
                  onChange={setGenres}
                  options={genreOptions}
                  onDeleteGenre={handleDeleteGenre}
                />
                <p className="mt-1.5 text-2xs text-text-disabled">
                  Required for upload. Optional when saving a draft.
                </p>
              </div>

              <Field label="Release year">
                <input
                  name="releaseYear"
                  type="number"
                  min={1900}
                  max={2100}
                  placeholder="2026"
                  className={textInputClass}
                />
              </Field>

              <Field label="Rating">
                <input
                  name="rating"
                  inputMode="decimal"
                  placeholder="8.7"
                  className={textInputClass}
                />
              </Field>

              <Field
                label="Runtime (minutes)"
                hint="Whole minutes only, e.g. 102 for 1h 42m."
              >
                <input
                  name="runtimeMinutes"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="102"
                  className={textInputClass}
                />
              </Field>

              <Field
                label="Status"
                hint="Published requires a poster and video on Assets. Scheduled can upload anytime and goes live later."
              >
                <AdminSelect
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    if (v !== "Scheduled") setPublishAtLocal("");
                  }}
                  options={[
                    { value: "Draft", label: "Draft" },
                    { value: "Review", label: "Review" },
                    { value: "Scheduled", label: "Scheduled" },
                    { value: "Published", label: "Published" },
                  ]}
                  className={selectClass}
                  aria-label="Status"
                />
                <input type="hidden" name="status" value={status} />
              </Field>

              {status === "Scheduled" ? (
                <Field
                  label="Go live (ICT)"
                  hint="Cambodia time (UTC+7). Publishes automatically when ready."
                >
                  <input
                    type="datetime-local"
                    value={publishAtLocal}
                    onChange={(e) => setPublishAtLocal(e.target.value)}
                    className={textInputClass}
                    required
                  />
                </Field>
              ) : null}

              <Field label="Price (USD)" hint={ADMIN_PRICE_HINT}>
                <input name="price" placeholder="0 or 2.99" className={textInputClass} />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Trailer URL"
                  hint="Paste a YouTube URL. The trailer is linked, not uploaded."
                >
                  <input
                    name="trailerUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={textInputClass}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    name="description"
                    rows={5}
                    placeholder="Short synopsis shown on detail pages and promotional placements."
                    className={`${textInputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>

            {detailsError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{detailsError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraftClick}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={() => goToStep(1)}>
                Continue to assets
              </Button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <AdminCard title="Upload assets">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-xl text-sm text-text-muted">
                Attach poster, banner, and main video. Video uploads go straight to R2, then
                transcoding starts. You can save a draft without a video and finish later.
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-bold",
                    posterFile
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {posterFile ? "Poster ready" : "Needs poster"}
                </span>
                <span
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-bold",
                    videoFile
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {videoFile ? "Video ready" : "Needs video"}
                </span>
                <span
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-bold",
                    bannerFile
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-bg text-text-muted",
                  ].join(" ")}
                >
                  {bannerFile ? "Banner ready" : "Banner optional"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AssetPicker
                name="poster"
                accept="image/*"
                label="Poster image"
                hint="Portrait key art. Required for Published."
                previewAspect="poster"
                icon={<ImageIcon size={20} aria-hidden />}
                file={posterFile}
                onFileChange={setPosterFile}
              />
              <AssetPicker
                name="banner"
                accept="image/*"
                label="Banner image"
                hint="Wide cinematic hero image. Optional."
                previewAspect="banner"
                icon={<ImagePlus size={20} aria-hidden />}
                file={bannerFile}
                onFileChange={setBannerFile}
              />
              <div className="lg:col-span-2">
                <AssetPicker
                  name="video"
                  accept="video/mp4,video/quicktime,video/*"
                  label="Movie file"
                  hint="Required for Published. Optional for draft."
                  icon={<Film size={20} aria-hidden />}
                  file={videoFile}
                  onFileChange={setVideoFile}
                />
              </div>
            </div>

            {submitError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{submitError}</p>
            ) : null}
            {currentJob && currentJob.status !== "done" ? (
              <div className="mt-4 rounded-lg border border-border bg-bg p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-text-muted">
                  <span>{currentJob.label}</span>
                  <span className="tabular-nums">{currentJob.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${currentJob.status === "error" ? "bg-danger" : "bg-brand"}`}
                    style={{ width: `${currentJob.percent}%` }}
                  />
                </div>
                {currentJob.status === "error" && currentJob.errorMsg ? (
                  <p className="mt-1 text-2xs text-danger">{currentJob.errorMsg}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <BackButton label="Back to details" onClick={() => goToStep(0)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraftClick}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Uploading…" : "Upload movie"}
                </Button>
              </div>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
