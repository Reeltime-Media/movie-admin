export type Status = "Published" | "Draft" | "Scheduled" | "Review";
export type RevenueKind = "Rental" | "Subscription" | "Ownership";

export type Episode = {
  id: string;
  /** API slug — required to PATCH episode metadata */
  slug?: string;
  number: number;
  title: string;
  runtime: string;
  isFree?: boolean;
  posterFileName?: string;
  videoFileName?: string;
  hlsMasterKey?: string | null;
  hlsMasterUrl?: string | null;
  /** Transient — not sent to the API */
  videoFile?: File;
  /** Transient — not sent to the API */
  posterFile?: File;
};

export type Season = {
  id: string;
  number: number;
  title: string;
  episodes: Episode[];
};

export type CatalogEntry = {
  id: string;
  /** API slug — used for series PATCH/DELETE since those endpoints are slug-based */
  slug?: string;
  title: string;
  type: "Movie" | "Series";
  description?: string | null;
  price: string;
  views: string;
  rating: string;
  status: Status;
  genre: string;
  owner: string;
  runtime?: string | null;
  /** Editable runtime in minutes (movies). */
  runtimeMinutes?: number | null;
  releaseYear?: number | null;
  posterKey?: string | null;
  posterUrl?: string | null;
  hlsMasterKey?: string | null;
  hlsMasterUrl?: string | null;
  trailerUrl?: string | null;
  transcodeStatus?: string;
  watchCount?: number;
  createdAt?: string;
  updatedAt?: string;
  seasons: Season[];
  seriesPosterFileName?: string;
};

export function statusClasses(status: Status) {
  const base = "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  const tones = {
    Published: "bg-success/15 text-success",
    Draft: "bg-text-disabled/25 text-text-muted",
    Scheduled: "bg-brand/15 text-brand",
    Review: "bg-warning/15 text-warning",
  };

  return `${base} ${tones[status]}`;
}
