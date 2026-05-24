import type { CatalogEntry } from "./adminData";

export function movieHasPoster(
  entry: Pick<CatalogEntry, "posterKey">,
  posterFile?: File | null,
) {
  return Boolean(entry.posterKey || posterFile?.size);
}

export function movieHasVideo(
  entry: Pick<CatalogEntry, "hlsMasterKey" | "transcodeStatus">,
  videoFile?: File | null,
) {
  return Boolean(
    entry.hlsMasterKey ||
      videoFile?.size ||
      entry.transcodeStatus === "processing" ||
      entry.transcodeStatus === "ready",
  );
}

export function validateMoviePublishReady(
  entry: Pick<CatalogEntry, "posterKey" | "hlsMasterKey" | "transcodeStatus">,
  options?: { posterFile?: File | null; videoFile?: File | null },
): { ok: true } | { ok: false; message: string } {
  if (!movieHasPoster(entry, options?.posterFile)) {
    return { ok: false, message: "A poster image is required before publishing." };
  }
  if (!movieHasVideo(entry, options?.videoFile)) {
    return { ok: false, message: "A movie video file is required before publishing." };
  }
  return { ok: true };
}
