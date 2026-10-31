export type Status = "Published" | "Draft" | "Scheduled" | "Review";
export type RevenueKind = "Rental" | "Subscription" | "Ownership";

export type Episode = {
  id: string;
  /** API slug — required to PATCH episode metadata / replace assets */
  slug?: string;
  number: number;
  title: string;
  runtime: string;
  isFree?: boolean;
  posterKey?: string | null;
  posterUrl?: string | null;
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
  /** Khmer title — optional bilingual companion to English `title`. */
  titleKm?: string | null;
  /** Optional region tag for the movie (e.g. country/locale of origin). Movies only. */
  region?: string | null;
  type: "Movie" | "Series";
  description?: string | null;
  price: string;
  views: string;
  rating: string;
  status: Status;
  /** UTC ISO go-live when status is Scheduled. */
  publishAt?: string | null;
  genre: string;
  owner: string;
  /** Series only — shows up on /short-movies in addition to /series. */
  isShortMovie?: boolean;
  runtime?: string | null;
  /** Editable runtime in minutes (movies). */
  runtimeMinutes?: number | null;
  releaseYear?: number | null;
  posterKey?: string | null;
  posterUrl?: string | null;
  bannerKey?: string | null;
  bannerUrl?: string | null;
  hlsMasterKey?: string | null;
  hlsMasterUrl?: string | null;
  trailerUrl?: string | null;
  transcodeStatus?: string;
  watchCount?: number;
  /** Undefined when the API predates purchase_count — render as "—", not 0. */
  purchaseCount?: number;
  createdAt?: string;
  updatedAt?: string;
  seasons: Season[];
  seriesPosterFileName?: string;
};

export function statusClasses(status: Status) {
  // Sits on top of poster art as well as on cards, so it carries its own surface.
  const base =
    "inline-flex items-center gap-1.5 rounded-md bg-surface/95 px-2 py-0.5 text-xs font-medium text-text ring-1 ring-black/5 before:size-1.5 before:shrink-0 before:rounded-full";
  const tones = {
    Published: "before:bg-success",
    Draft: "before:bg-text-disabled",
    Scheduled: "before:bg-brand",
    Review: "before:bg-warning",
  };

  return `${base} ${tones[status]}`;
}
