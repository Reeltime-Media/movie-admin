export type Status = "Published" | "Draft" | "Scheduled" | "Review" | "Coming soon";
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
  genre: string;
  owner: string;
  runtime?: string | null;
  /** Editable runtime in minutes (movies). */
  runtimeMinutes?: number | null;
  releaseYear?: number | null;
  /** ISO datetime. Announced release date/time for a "Coming soon" movie; null = TBA. */
  releaseAt?: string | null;
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
  const base =
    "inline-flex items-center rounded-lg px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em] ring-1 ring-inset";
  const tones = {
    Published: "bg-success/10 text-success ring-success/25",
    Draft: "bg-text-disabled/10 text-text-muted ring-text-disabled/25",
    Scheduled: "bg-brand/10 text-brand ring-brand/30",
    Review: "bg-warning/10 text-warning ring-warning/25",
    "Coming soon": "bg-brand-soft text-brand ring-brand/30",
  };

  return `${base} ${tones[status]}`;
}
