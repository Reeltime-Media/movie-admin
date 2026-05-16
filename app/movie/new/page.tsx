"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";
import { EpisodeAssetsUploader } from "../../components/EpisodeAssetsUploader";
import { GenreMultiSelect } from "../../components/GenreMultiSelect";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import { SeasonsEpisodesEditor } from "../../components/SeasonsEpisodesEditor";
import type { Season, Status } from "../../lib/adminData";
import {
  addEpisodeApi,
  completeMovieUpload,
  createSeries,
  startMovieUpload,
  uploadFileToPresignedUrl,
} from "../../lib/api";
import { TrailerPreview } from "../../components/TrailerPreview";
import { formatGenres } from "../../lib/genres";
import {
  defaultSeasons,
  episodesAllHaveVideo,
  validateSeriesSeasons,
} from "../../lib/seriesHelpers";

const textInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "w-full rounded-md border border-dashed border-border bg-bg px-3 py-4 text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white hover:border-border-hover";

const movieStepLabels = ["Format", "Details", "Assets"] as const;
const seriesStepLabels = ["Format", "Seasons", "Details", "Episode media"] as const;

function parseStatus(s: string): Status {
  if (s === "Published" || s === "Draft" || s === "Scheduled" || s === "Review") return s;
  return "Draft";
}

function toApiStatus(status: Status) {
  return status.toLowerCase();
}

function parseMoney(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  return normalized || "0";
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
      <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] text-text-disabled">{hint}</span> : null}
    </label>
  );
}

export default function NewCatalogTitlePage() {
  const router = useRouter();
  const { refreshMovies } = useMovieCatalog();
  const [step, setStep] = useState(0);
  const [pendingType, setPendingType] = useState<"Movie" | "Series" | null>(null);
  const [contentType, setContentType] = useState<"Movie" | "Series">("Movie");
  const [genres, setGenres] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seriesPosterFile, setSeriesPosterFile] = useState<File | null>(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const isSeries = contentType === "Series";
  const stepLabelList = isSeries ? seriesStepLabels : movieStepLabels;

  const continueFromFormat = () => {
    if (!pendingType) return;
    setContentType(pendingType);
    if (pendingType === "Movie") {
      setSeasons([]);
    } else if (seasons.length === 0) {
      setSeasons(defaultSeasons());
    }
    setDetailsError(null);
    setSeasonsError(null);
    setStep(1);
  };

  const continueFromSeasons = () => {
    setSeasonsError(null);
    if (!validateSeriesSeasons(seasons)) {
      const message = "Add at least one season with episodes, and give every episode a title before continuing.";
      setSeasonsError(message);
      toast.warning(message);
      return;
    }
    setStep(2);
  };

  const continueFromDetails = () => {
    setDetailsError(null);
    const form = document.getElementById("upload-wizard-form") as HTMLFormElement | null;
    const title = form?.querySelector<HTMLInputElement>('input[name="title"]')?.value?.trim() ?? "";
    if (!title) {
      const message = "Enter a title to continue.";
      setDetailsError(message);
      toast.warning(message);
      return;
    }
    const genre = formatGenres(genres);
    if (!genre) {
      const message = "Select at least one genre.";
      setDetailsError(message);
      toast.warning(message);
      return;
    }
    setStep(isSeries ? 3 : 2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const intent = String(fd.get("intent") || "");
    const title = String(fd.get("title") || "").trim();
    if (!title) return;

    const genre = formatGenres(genres);
    if (!genre) return;

    setSubmitError(null);
    setUploadProgress(null);
    setUploadStatus("");

    const status: Status = intent === "draft" ? "Draft" : parseStatus(String(fd.get("status")));

    // ── Movie upload ──────────────────────────────────────────────────────────
    if (contentType === "Movie") {
      const videoFile = fd.get("video");
      const posterFile = fd.get("poster");
      const video = videoFile instanceof File && videoFile.size > 0 ? videoFile : null;
      const posterImage = posterFile instanceof File && posterFile.size > 0 ? posterFile : null;

      if (!video) {
        const message = "Choose a movie video file before uploading.";
        setSubmitError(message);
        toast.warning(message);
        return;
      }

      setIsSubmitting(true);
      try {
        setUploadProgress(0);
        setUploadStatus("Starting upload…");
        const upload = await startMovieUpload({
          videoContentType: video.type || "video/mp4",
          posterContentType: posterImage?.type,
        });

        if (posterImage && upload.poster_upload_url) {
          setUploadStatus("Uploading poster…");
          await uploadFileToPresignedUrl(upload.poster_upload_url, posterImage);
        }

        setUploadStatus("Uploading video…");
        await uploadFileToPresignedUrl(upload.video_upload_url, video, setUploadProgress);

        setUploadStatus("Saving…");
        await completeMovieUpload({
          contentId: upload.content_id,
          sourceKey: upload.source_key,
          title,
          priceUsd: parseMoney(String(fd.get("price") || "")),
          description: String(fd.get("description") || "").trim(),
          genres,
          releaseYear: parseOptionalNumber(fd.get("releaseYear")),
          rating: String(fd.get("rating") || "").trim(),
          runtime: String(fd.get("runtime") || "").trim(),
          status: toApiStatus(status),
          posterKey: upload.poster_key,
          trailerUrl: String(fd.get("trailerUrl") || "").trim(),
        });

        await refreshMovies();
        toast.success(intent === "draft" ? "Draft saved" : "Movie uploaded successfully");
        router.push("/movie");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setSubmitError(message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
        setUploadStatus("");
      }
      return;
    }

    // ── Series upload ─────────────────────────────────────────────────────────
    const seasonPayload = seasons;
    if (!validateSeriesSeasons(seasonPayload)) {
      const message = "Add at least one season with episodes, and give every episode a title.";
      setSubmitError(message);
      toast.warning(message);
      return;
    }

    if (intent === "upload" && !episodesAllHaveVideo(seasonPayload)) {
      const message = "Upload requires a video file for every episode. Poster per episode is optional.";
      setSubmitError(message);
      toast.warning(message);
      return;
    }

    setIsSubmitting(true);
    try {
      setUploadStatus("Creating series…");
      const series = await createSeries({
        title,
        monthlyPriceUsd: parseMoney(String(fd.get("price") || "0")),
        description: String(fd.get("description") || "").trim() || undefined,
        genres,
        releaseYear: parseOptionalNumber(fd.get("releaseYear")),
        rating: String(fd.get("rating") || "").trim() || undefined,
        poster: seriesPosterFile ?? undefined,
      });

      const allEpisodes = seasonPayload.flatMap((s) =>
        s.episodes.map((ep) => ({ season: s, ep })),
      );
      const episodesWithVideo = allEpisodes.filter((x) => x.ep.videoFile);
      let done = 0;

      for (const { season, ep } of episodesWithVideo) {
        setUploadStatus(`Uploading S${season.number}E${ep.number} – ${ep.title}…`);
        setUploadProgress(Math.round((done / episodesWithVideo.length) * 100));
        await addEpisodeApi(
          series.slug,
          {
            title: ep.title,
            seasonNumber: season.number,
            episodeNumber: ep.number,
            description: undefined,
            runtime: ep.runtime || undefined,
            status: toApiStatus(status),
          },
          ep.videoFile!,
          ep.posterFile,
        );
        done++;
      }

      setUploadProgress(100);
      await refreshMovies();
      toast.success(intent === "draft" ? "Series saved as draft" : "Series created successfully");
      router.push("/movie");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Series creation failed";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      setUploadStatus("");
    }
  };

  const showDetails = (contentType === "Movie" && step === 1) || (contentType === "Series" && step === 2);
  const showSeasonsStep = contentType === "Series" && step === 1;
  const showMovieAssets = contentType === "Movie" && step === 2;
  const showSeriesAssets = contentType === "Series" && step === 3;

  const stepperLabels =
    step === 0 && pendingType === "Series"
      ? seriesStepLabels
      : step === 0
        ? movieStepLabels
        : stepLabelList;

  return (
    <AdminShell title="Upload new title">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
          {(pendingType ?? contentType) === "Series"
            ? "Series: pick format, build seasons and episodes, enter show details, then attach poster and per-episode video files."
            : "Movies: pick format, enter details and publishing, then upload the video directly to storage before transcoding starts."}
        </p>
        <Link
          href="/movie"
          className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to movies
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {stepperLabels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={`${label}-${i}`} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="text-[12px] font-bold text-text-disabled" aria-hidden>/</span>
              ) : null}
              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
                  active ? "bg-brand text-white" : done ? "bg-success/15 text-success" : "bg-surface text-text-muted",
                ].join(" ")}
              >
                {i + 1}. {label}
              </span>
            </div>
          );
        })}
      </div>

      <form id="upload-wizard-form" onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {step === 0 ? (
          <AdminCard title="Choose format">
            <p className="mb-5 text-[13px] text-text-muted">
              Select whether you are adding one standalone title or a series with seasons and episodes.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {(["Movie", "Series"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPendingType(t)}
                  className={[
                    "rounded-lg border p-6 text-left transition-colors",
                    pendingType === t
                      ? "border-brand bg-brand/10 ring-1 ring-brand"
                      : "border-border bg-bg hover:border-border-hover",
                  ].join(" ")}
                >
                  <div className="text-[15px] font-extrabold tracking-[-0.02em]">
                    {t === "Movie" ? "Single movie" : "Series"}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                    {t === "Movie"
                      ? "One feature film or rental title without seasons."
                      : "Multiple seasons and episodes under one show title."}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Link
                href="/movie"
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={!pendingType}
                onClick={continueFromFormat}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </AdminCard>
        ) : null}

        {contentType === "Series" ? (
          <div className={showSeasonsStep ? "block" : "hidden"} aria-hidden={!showSeasonsStep}>
            <AdminCard title="Seasons and episodes">
              <p className="mb-5 text-[13px] text-text-muted">
                Create every season and episode first. You will attach video and poster files for each episode in the next step.
              </p>
              <SeasonsEpisodesEditor seasons={seasons} onChange={setSeasons} />
              {seasonsError ? (
                <p className="mt-4 text-[12px] font-semibold text-warning">{seasonsError}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setPendingType(contentType); setStep(0); }}
                  className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={continueFromSeasons}
                  className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
                >
                  Continue
                </button>
              </div>
            </AdminCard>
          </div>
        ) : null}

        <div className={showDetails ? "block" : "hidden"} aria-hidden={!showDetails}>
          <AdminCard title="Title and details">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-disabled">Format</span>
              <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-[12px] font-bold text-text">
                {contentType === "Series" ? "Series" : "Single movie"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input name="title" required placeholder={isSeries ? "Echo Valley" : "The Last Drive"} className={textInputClass} />
              </Field>

              <div className="md:col-span-2">
                <div className="mb-1.5 text-[12px] font-semibold text-text-muted">Genres</div>
                <GenreMultiSelect selected={genres} onChange={setGenres} />
                <p className="mt-1.5 text-[11px] text-text-disabled">Open the list and select one or more genres.</p>
              </div>

              <Field label="Release year">
                <input name="releaseYear" type="number" min={1900} max={2100} placeholder="2026" className={textInputClass} />
              </Field>

              <Field label="Rating">
                <input name="rating" inputMode="decimal" placeholder="8.7" className={textInputClass} />
              </Field>

              {!isSeries ? (
                <Field label="Runtime">
                  <input name="runtime" placeholder="1h 42m" className={textInputClass} />
                </Field>
              ) : null}

              <Field label="Status" hint={isSeries ? undefined : "Upload uses this status. Save draft always saves as Draft."}>
                <select name="status" defaultValue="Published" className={selectClass}>
                  <option>Draft</option>
                  <option>Review</option>
                  <option>Scheduled</option>
                  <option>Published</option>
                </select>
              </Field>

              <Field label={isSeries ? "Monthly price (USD)" : "Price (USD)"}>
                <input name="price" placeholder={isSeries ? "9.99" : "2.99"} className={textInputClass} />
              </Field>

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
              <p className="mt-4 text-[12px] font-semibold text-warning">{detailsError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isSeries) { setStep(1); } else { setPendingType(contentType); setStep(0); }
                }}
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueFromDetails}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
              >
                Continue
              </button>
            </div>
          </AdminCard>
        </div>

        {/* Movie assets step */}
        <div className={showMovieAssets ? "block" : "hidden"} aria-hidden={!showMovieAssets}>
          <AdminCard title="Upload assets">
            <p className="mb-5 text-[13px] text-text-muted">
              Attach poster and main video. The video is sent directly to R2, then the API queues transcoding.
            </p>
            <div className="space-y-4">
              <Field label="Poster image" hint="PNG, JPG, or WebP. Recommended portrait poster.">
                <input name="poster" type="file" accept="image/*" className={fileInputClass} />
              </Field>
              <Field label="Movie file" hint="MP4 or MOV.">
                <input name="video" type="file" accept="video/mp4,video/quicktime,video/*" className={fileInputClass} />
              </Field>
              <div>
                <Field label="Trailer URL" hint="Paste a YouTube URL. The trailer is linked, not uploaded.">
                  <input
                    name="trailerUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={textInputClass}
                    value={trailerUrl}
                    onChange={(e) => setTrailerUrl(e.target.value)}
                  />
                </Field>
                <TrailerPreview url={trailerUrl} />
              </div>
            </div>

            {submitError ? (
              <p className="mt-4 text-[12px] font-semibold text-warning">{submitError}</p>
            ) : null}
            {uploadProgress !== null ? (
              <div className="mt-4 rounded-md border border-border bg-bg p-3">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-text-muted">
                  <span>{uploadStatus || "Uploading…"}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Back
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isSubmitting}
                className="rounded-md border border-border bg-surface-elevated px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:border-border-hover disabled:opacity-40"
              >
                Save draft
              </button>
              <button
                type="submit"
                name="intent"
                value="upload"
                disabled={isSubmitting}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
              >
                {isSubmitting ? "Uploading…" : "Upload"}
              </button>
            </div>
          </AdminCard>
        </div>

        {/* Series episode media step */}
        <div className={showSeriesAssets ? "block" : "hidden"} aria-hidden={!showSeriesAssets}>
          <AdminCard title="Episode media">
            <p className="mb-5 text-[13px] text-text-muted">
              Upload a series key art poster (optional), then attach each episode&apos;s video (required for Upload) and episode poster (optional).
            </p>

            <div className="mb-8 rounded-lg border border-border bg-bg p-4">
              <span className="block text-[12px] font-semibold text-text-muted">Series poster</span>
              <input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => setSeriesPosterFile(e.target.files?.[0] ?? null)}
              />
              {seriesPosterFile ? (
                <p className="mt-2 text-[11px] text-text-muted">{seriesPosterFile.name}</p>
              ) : null}
            </div>

            <EpisodeAssetsUploader seasons={seasons} onChange={setSeasons} />

            {submitError ? (
              <p className="mt-4 text-[12px] font-semibold text-warning">{submitError}</p>
            ) : null}
            {uploadProgress !== null ? (
              <div className="mt-4 rounded-md border border-border bg-bg p-3">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-text-muted">
                  <span>{uploadStatus || "Uploading…"}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Back
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isSubmitting}
                className="rounded-md border border-border bg-surface-elevated px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:border-border-hover disabled:opacity-40"
              >
                {isSubmitting ? "Saving…" : "Save draft"}
              </button>
              <button
                type="submit"
                name="intent"
                value="upload"
                disabled={isSubmitting}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
              >
                {isSubmitting ? "Uploading…" : "Upload"}
              </button>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
