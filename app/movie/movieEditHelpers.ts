import type { CatalogEntry } from "../lib/adminData";

export function pickAssetFile(file: File | null | undefined): File | null {
  return file && file.size > 0 ? file : null;
}

export function pickFileFromInput(files: FileList | null | undefined): File | null {
  return pickAssetFile(files?.[0] ?? null);
}

export function toMovieDraft(entry: CatalogEntry): Omit<CatalogEntry, "id"> {
  return {
    title: entry.title,
    titleKm: entry.titleKm ?? null,
    region: entry.region ?? null,
    description: entry.description,
    type: entry.type,
    price: entry.price,
    views: entry.views,
    rating: entry.rating,
    runtime: entry.runtime,
    runtimeMinutes: entry.runtimeMinutes,
    releaseYear: entry.releaseYear,
    releaseAt: entry.releaseAt,
    status: entry.status,
    genre: entry.genre,
    owner: entry.owner,
    posterKey: entry.posterKey,
    posterUrl: entry.posterUrl,
    bannerKey: entry.bannerKey,
    bannerUrl: entry.bannerUrl,
    hlsMasterKey: entry.hlsMasterKey,
    hlsMasterUrl: entry.hlsMasterUrl,
    trailerUrl: entry.trailerUrl,
    transcodeStatus: entry.transcodeStatus,
    watchCount: entry.watchCount,
    updatedAt: entry.updatedAt,
    seasons: entry.seasons,
    seriesPosterFileName: entry.seriesPosterFileName,
  };
}
