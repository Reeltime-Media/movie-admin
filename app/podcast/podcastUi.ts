import type { Status } from "../lib/adminData";

export const podcastTextInputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-white focus:border-border-hover focus:bg-surface-elevated";

export const podcastSelectClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

export const podcastFileInputClass =
  "w-full rounded-lg border border-dashed border-border bg-bg px-3 py-4 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-border-hover";

export function toUiStatus(status: string): Status {
  const normalized = status.trim().toLowerCase();
  if (normalized === "published") return "Published";
  if (normalized === "scheduled") return "Scheduled";
  if (normalized === "review") return "Review";
  return "Draft";
}

export function toApiStatus(status: Status) {
  return status.toLowerCase();
}

export function formatPodcastDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function validatePodcastPublishReady(
  podcast: { poster_key?: string | null; audio_key?: string | null },
  files?: { posterFile?: File | null; audioFile?: File | null },
): { ok: true } | { ok: false; message: string } {
  const hasPoster = Boolean(podcast.poster_key) || Boolean(files?.posterFile && files.posterFile.size > 0);
  const hasAudio = Boolean(podcast.audio_key) || Boolean(files?.audioFile && files.audioFile.size > 0);
  if (!hasPoster) {
    return { ok: false, message: "A cover image is required before publishing." };
  }
  if (!hasAudio) {
    return { ok: false, message: "An audio file is required before publishing." };
  }
  return { ok: true };
}
