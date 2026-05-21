"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type CatalogEntry, type Status } from "../lib/adminData";
import {
  deleteAdminMovie,
  deleteAdminSeriesApi,
  getAdminToken,
  listAllAdminMovies,
  listAllAdminSeries,
  listSeriesEpisodesApi,
  updateAdminMovie,
  updateSeriesApi,
  type ApiContent,
  type ApiSeasonRead,
  type ApiSeries,
} from "../lib/api";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { mediaUrl } from "../lib/media";

export type MovieDraft = Omit<CatalogEntry, "id">;

type MovieCatalogContextValue = {
  movies: CatalogEntry[];
  isLoading: boolean;
  error: string | null;
  refreshMovies: () => Promise<void>;
  updateMovie: (id: string, entry: MovieDraft) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
};

const MovieCatalogContext = createContext<MovieCatalogContextValue | null>(null);

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function isStatus(x: unknown): x is Status {
  return typeof x === "string" && statuses.includes(x as Status);
}

function toStatus(status: string): Status {
  const normalized = status.toLowerCase();
  if (normalized === "published") return "Published";
  if (normalized === "scheduled") return "Scheduled";
  if (normalized === "review") return "Review";
  return "Draft";
}

function toApiStatus(status: Status) {
  return status.toLowerCase();
}

function moneyToApi(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

function ratingToApi(value: string) {
  const normalized = value.trim();
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

function apiContentToCatalogEntry(content: ApiContent): CatalogEntry {
  return {
    id: content.id,
    title: content.title,
    type: "Movie",
    description: content.description,
    price: content.price_usd ? `$${content.price_usd}` : "-",
    views: "-",
    rating: content.rating ?? "-",
    status: toStatus(content.status),
    genre: formatGenres(content.genres),
    owner: content.transcode_status === "ready" ? "API - ready" : `API - ${content.transcode_status}`,
    runtime: content.runtime,
    releaseYear: content.release_year,
    posterKey: content.poster_key,
    posterUrl: mediaUrl(content.poster_key),
    hlsMasterKey: content.hls_master_key,
    hlsMasterUrl: mediaUrl(content.hls_master_key),
    trailerUrl: content.trailer_url,
    transcodeStatus: content.transcode_status,
    createdAt: content.created_at,
    updatedAt: content.updated_at,
    seasons: [],
  };
}

function mapApiSeasons(apiSeasons: ApiSeasonRead[]): import("../lib/adminData").Season[] {
  return apiSeasons.map((s) => ({
    id: `s-${s.season_number}`,
    number: s.season_number,
    title: `Season ${s.season_number}`,
    episodes: s.episodes.map((ep) => ({
      id: ep.id,
      number: ep.episode_number ?? 0,
      title: ep.title,
      runtime: ep.runtime ?? "",
      posterFileName: ep.poster_key ?? undefined,
      videoFileName: ep.hls_master_key ?? undefined,
    })),
  }));
}

function apiSeriesToCatalogEntry(series: ApiSeries, apiSeasons: ApiSeasonRead[] = []): CatalogEntry {
  return {
    id: series.id,
    slug: series.slug,
    title: series.title,
    type: "Series",
    description: series.description,
    price: "Subscription",
    views: "-",
    rating: series.rating ?? "-",
    status: series.is_published ? "Published" : "Draft",
    genre: formatGenres(series.genres),
    owner: "API",
    runtime: null,
    releaseYear: series.release_year,
    posterKey: series.poster_key,
    posterUrl: mediaUrl(series.poster_key),
    hlsMasterKey: null,
    hlsMasterUrl: null,
    trailerUrl: null,
    transcodeStatus: undefined,
    createdAt: series.created_at,
    updatedAt: series.updated_at,
    seasons: mapApiSeasons(apiSeasons),
  };
}

export function MovieCatalogProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMovies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!getAdminToken()) {
      setMovies([]);
      setIsLoading(false);
      return;
    }

    try {
      const [apiMovies, apiSeries] = await Promise.all([
        listAllAdminMovies(),
        listAllAdminSeries().catch(() => [] as ApiSeries[]),
      ]);
      const episodesBySeries = await Promise.all(
        apiSeries.map((s) =>
          listSeriesEpisodesApi(s.slug).catch(() => [] as ApiSeasonRead[]),
        ),
      );
      setMovies([
        ...apiMovies.map(apiContentToCatalogEntry),
        ...apiSeries.map((s, i) => apiSeriesToCatalogEntry(s, episodesBySeries[i])),
      ]);
    } catch (err) {
      setMovies([]);
      setError(err instanceof Error ? err.message : "Could not load movies from API");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshMovies();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshMovies]);

  const updateMovie = useCallback(
    async (id: string, entry: MovieDraft) => {
      const existing = movies.find((m) => m.id === id);
      if (existing?.type === "Series" && existing.slug) {
        const updated = await updateSeriesApi(existing.slug, {
          title: entry.title,
          genres: parseGenresFromStored(entry.genre),
          rating: ratingToApi(entry.rating) ?? null,
          monthly_price_usd: moneyToApi(entry.price) ?? null,
          is_published: entry.status === "Published",
        });
        setMovies((prev) =>
          prev.map((m) => (m.id === id ? apiSeriesToCatalogEntry(updated) : m)),
        );
        return;
      }
      const updated = await updateAdminMovie(id, {
        title: entry.title,
        description: entry.description ?? null,
        genres: parseGenresFromStored(entry.genre),
        priceUsd: moneyToApi(entry.price),
        rating: ratingToApi(entry.rating),
        status: toApiStatus(entry.status as Status),
        trailerUrl: entry.trailerUrl,
      });
      setMovies((prev) => prev.map((m) => (m.id === id ? apiContentToCatalogEntry(updated) : m)));
    },
    [movies],
  );

  const deleteMovie = useCallback(
    async (id: string) => {
      const existing = movies.find((m) => m.id === id);
      if (existing?.type === "Series" && existing.slug) {
        await deleteAdminSeriesApi(existing.slug);
      } else {
        await deleteAdminMovie(id);
      }
      setMovies((prev) => prev.filter((m) => m.id !== id));
    },
    [movies],
  );

  const value = useMemo(
    () => ({ movies, isLoading, error, refreshMovies, updateMovie, deleteMovie }),
    [movies, isLoading, error, refreshMovies, updateMovie, deleteMovie],
  );

  return <MovieCatalogContext.Provider value={value}>{children}</MovieCatalogContext.Provider>;
}

export function useMovieCatalog() {
  const ctx = useContext(MovieCatalogContext);
  if (!ctx) {
    throw new Error("useMovieCatalog must be used within MovieCatalogProvider");
  }
  return ctx;
}
