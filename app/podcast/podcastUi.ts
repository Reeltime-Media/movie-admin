import type { Status } from "../lib/adminData";

export const PODCAST_ACCESS_OPTIONS = [
  { value: "plan", label: "Included with Plan" },
  { value: "free", label: "Free" },
] as const;

export type PodcastAccess = (typeof PODCAST_ACCESS_OPTIONS)[number]["value"];

export function podcastAccessFromIsFree(isFree: boolean): PodcastAccess {
  return isFree ? "free" : "plan";
}

export function isFreeFromPodcastAccess(access: PodcastAccess): boolean {
  return access === "free";
}

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

/** Read audio duration from a local file via HTMLAudioElement metadata. */
export function detectAudioDurationMinutes(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    const finish = (minutes: number | undefined) => {
      URL.revokeObjectURL(url);
      resolve(minutes);
    };
    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      if (!Number.isFinite(seconds) || seconds <= 0) {
        finish(undefined);
        return;
      }
      finish(Math.max(1, Math.round(seconds / 60)));
    };
    audio.onerror = () => finish(undefined);
    audio.src = url;
  });
}

export function formatRuntimeMinutes(minutes?: number | null) {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
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
