import { type CatalogEntry, type Season, type Status } from "./adminData";
import {
  deleteAdminMovie,
  deleteAdminSeriesApi,
  getAdminToken,
  listAllAdminMovies,
  listAllAdminSeries,
  listSeriesEpisodesApi,
  updateAdminMovie,
  updateEpisodeApi,
  updateSeriesApi,
  type ApiContent,
  type ApiSeasonRead,
  type ApiSeries,
} from "./api";
import { formatGenres, parseGenresFromStored } from "./genres";
import { mediaUrl } from "./media";
import { validateAdminPriceUsd } from "./money";
import { runtimeMinutesFromApi } from "./runtime";

export type MovieDraft = Omit<CatalogEntry, "id">;

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

function ratingToApi(value: string) {
  const normalized = value.trim();
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

function formatWatchers(count: number) {
  return count.toLocaleString();
}

export function apiContentToCatalogEntry(content: ApiContent): CatalogEntry {
  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    type: "Movie",
    description: content.description,
    price:
      content.price_usd && Number.parseFloat(content.price_usd) > 0
        ? `$${content.price_usd}`
        : "Free",
    views: formatWatchers(content.watch_count ?? 0),
    watchCount: content.watch_count ?? 0,
    rating: content.rating ?? "-",
    status: toStatus(content.status),
    genre: formatGenres(content.genres),
    owner: content.transcode_status === "ready" ? "API - ready" : `API - ${content.transcode_status}`,
    runtime: content.runtime,
    runtimeMinutes: runtimeMinutesFromApi(content),
    releaseYear: content.release_year,
    posterKey: content.poster_key,
    posterUrl: mediaUrl(content.poster_key),
    bannerKey: content.banner_key,
    bannerUrl: mediaUrl(content.banner_key),
    hlsMasterKey: content.hls_master_key,
    hlsMasterUrl: mediaUrl(content.hls_master_key),
    trailerUrl: content.trailer_url,
    transcodeStatus: content.transcode_status,
    createdAt: content.created_at,
    updatedAt: content.updated_at,
    seasons: [],
  };
}

function mapApiSeasons(apiSeasons: ApiSeasonRead[]): Season[] {
  return apiSeasons.map((s) => ({
    id: `s-${s.season_number}`,
    number: s.season_number,
    title: `Season ${s.season_number}`,
    episodes: s.episodes.map((ep) => ({
      id: ep.id,
      slug: ep.slug,
      number: ep.episode_number ?? 0,
      title: ep.title,
      runtime: ep.runtime ?? "",
      isFree: ep.is_free,
      posterFileName: ep.poster_key ?? undefined,
      videoFileName: ep.hls_master_key ?? undefined,
      hlsMasterKey: ep.hls_master_key,
      hlsMasterUrl: mediaUrl(ep.hls_master_key),
    })),
  }));
}

export function apiSeriesToCatalogEntry(series: ApiSeries, apiSeasons: ApiSeasonRead[] = []): CatalogEntry {
  return {
    id: series.id,
    slug: series.slug,
    title: series.title,
    type: "Series",
    description: series.description,
    price:
      series.monthly_price_usd && Number.parseFloat(series.monthly_price_usd) > 0
        ? `$${series.monthly_price_usd}`
        : "Free",
    views: "-",
    rating: series.rating ?? "-",
    status: series.is_published ? "Published" : "Draft",
    genre: formatGenres(series.genres),
    owner: "API",
    runtime: null,
    releaseYear: series.release_year,
    posterKey: series.poster_key,
    posterUrl: mediaUrl(series.poster_key),
    bannerKey: series.banner_key,
    bannerUrl: mediaUrl(series.banner_key),
    hlsMasterKey: null,
    hlsMasterUrl: null,
    trailerUrl: series.trailer_url,
    transcodeStatus: undefined,
    createdAt: series.created_at,
    updatedAt: series.updated_at,
    seasons: mapApiSeasons(apiSeasons),
  };
}

export async function fetchCatalog(): Promise<CatalogEntry[]> {
  if (!getAdminToken()) {
    return [];
  }

  const [apiMovies, apiSeries] = await Promise.all([
    listAllAdminMovies(),
    listAllAdminSeries().catch(() => [] as ApiSeries[]),
  ]);
  const episodesBySeries = await Promise.all(
    apiSeries.map((s) => listSeriesEpisodesApi(s.slug).catch(() => [] as ApiSeasonRead[])),
  );
  return [
    ...apiMovies.map(apiContentToCatalogEntry),
    ...apiSeries.map((s, i) => apiSeriesToCatalogEntry(s, episodesBySeries[i])),
  ];
}

export async function updateCatalogEntry(
  movies: CatalogEntry[],
  id: string,
  entry: MovieDraft,
): Promise<CatalogEntry[]> {
  const existing = movies.find((m) => m.id === id);
  if (!existing) {
    throw new Error("Title not found in catalog");
  }

  if (existing.type === "Series" && existing.slug) {
    const patch: Parameters<typeof updateSeriesApi>[1] = {
      title: entry.title,
      description: entry.description ?? null,
      genres: parseGenresFromStored(entry.genre),
      is_published: entry.status === "Published",
      trailer_url: entry.trailerUrl ?? null,
      release_year: entry.releaseYear ?? null,
    };
    const rating = ratingToApi(entry.rating);
    if (rating != null) patch.rating = rating;
    const monthlyPriceResult = validateAdminPriceUsd(entry.price);
    if (!monthlyPriceResult.ok) {
      throw new Error(monthlyPriceResult.message);
    }
    patch.monthly_price_usd = monthlyPriceResult.value;

    const updated = await updateSeriesApi(existing.slug, patch);

    const episodeUpdates: Promise<unknown>[] = [];
    for (const season of entry.seasons) {
      for (const ep of season.episodes) {
        if (!ep.slug) continue;
        const priorSeason = existing.seasons.find((s) => s.number === season.number);
        const priorEp = priorSeason?.episodes.find((e) => e.id === ep.id);
        const changed =
          !priorEp ||
          priorEp.title !== ep.title ||
          priorEp.runtime !== ep.runtime ||
          Boolean(priorEp.isFree) !== Boolean(ep.isFree);
        if (!changed) continue;
        episodeUpdates.push(
          updateEpisodeApi(existing.slug, ep.slug, {
            title: ep.title,
            runtime: ep.runtime || null,
            isFree: Boolean(ep.isFree),
          }),
        );
      }
    }
    if (episodeUpdates.length) {
      await Promise.all(episodeUpdates);
    }

    const apiSeasons = await listSeriesEpisodesApi(existing.slug).catch(() => null);
    const updatedEntry = {
      ...apiSeriesToCatalogEntry(updated),
      seasons: apiSeasons ? mapApiSeasons(apiSeasons) : entry.seasons,
    };
    return movies.map((m) => (m.id === id ? updatedEntry : m));
  }

  const priceResult = validateAdminPriceUsd(entry.price);
  if (!priceResult.ok) {
    throw new Error(priceResult.message);
  }
  const updated = await updateAdminMovie(id, {
    title: entry.title,
    description: entry.description ?? null,
    genres: parseGenresFromStored(entry.genre),
    priceUsd: priceResult.value,
    rating: ratingToApi(entry.rating),
    runtimeMinutes: entry.runtimeMinutes ?? null,
    releaseYear: entry.releaseYear ?? null,
    status: toApiStatus(entry.status as Status),
    trailerUrl: entry.trailerUrl,
  });
  const updatedEntry = apiContentToCatalogEntry({
    ...updated,
    watch_count: existing.watchCount ?? 0,
  } as ApiContent);
  return movies.map((m) => (m.id === id ? updatedEntry : m));
}

export async function deleteCatalogEntry(movies: CatalogEntry[], id: string): Promise<CatalogEntry[]> {
  const existing = movies.find((m) => m.id === id);
  if (!existing) {
    return movies;
  }
  if (existing.type === "Series") {
    await deleteAdminSeriesApi(existing.id);
  } else {
    await deleteAdminMovie(id);
  }
  return movies.filter((m) => m.id !== id);
}
