import {
  fetchAllPages,
  paginationQuery,
  type PaginatedResponse,
  type PaginationQuery,
} from "./pagination";

import { imageContentType, inferFileContentType, videoContentType } from "./media";
import { resolveApiUrl } from "./resolve-api-url";

const TOKEN_KEY = "reeltime_admin_token";

export type { PaginatedResponse, PaginationQuery } from "./pagination";
export { fetchAllPages } from "./pagination";

export type ApiSeries = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  genres: string[];
  release_year: number | null;
  rating: string | null;
  monthly_price_usd: string | null;
  poster_key: string | null;
  banner_key: string | null;
  trailer_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type TranscodeJob = {
  id: string;
  content_id: string;
  source_key: string;
  status: string;
  attempts: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  content_title?: string | null;
  content_type?: string | null;
  content_slug?: string | null;
  series_id?: string | null;
  series_title?: string | null;
  season_number?: number | null;
  episode_number?: number | null;
};

export type MultipartPartUrl = {
  part_number: number;
  url: string;
};

export type MovieUploadStartResponse = {
  content_id: string;
  slug: string;
  upload_id: string;
  source_key: string;
  part_size: number;
  part_count: number;
  part_urls: MultipartPartUrl[];
  poster_key: string | null;
  poster_upload_url: string | null;
  banner_key: string | null;
  banner_upload_url: string | null;
};

export type EpisodeUploadStartResponse = {
  content_id: string;
  episode_slug: string;
  upload_id: string;
  source_key: string;
  part_size: number;
  part_count: number;
  part_urls: MultipartPartUrl[];
  poster_key: string | null;
  poster_upload_url: string | null;
};

const MULTIPART_UPLOAD_CONCURRENCY = 4;
const EPISODE_UPLOAD_CONCURRENCY = 3;

export type MovieAssetUploadStartResponse = {
  source_key: string | null;
  video_upload_url: string | null;
  poster_key: string | null;
  poster_upload_url: string | null;
  banner_key: string | null;
  banner_upload_url: string | null;
};

export type ApiContent = {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string | null;
  series_id: string | null;
  season_number: number | null;
  episode_number: number | null;
  genres: string[];
  release_year: number | null;
  rating: string | null;
  runtime: string | null;
  duration_seconds: number | null;
  poster_key: string | null;
  banner_key: string | null;
  trailer_url: string | null;
  hls_master_key: string | null;
  price_usd: string | null;
  status: string;
  is_published: boolean;
  transcode_status: string;
  watch_count: number;
  created_at: string;
  updated_at: string;
};

export type ApiUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("reeltime-admin-auth-cleared"));
}

export type ApiPaymentIntent = {
  intent_id: string;
  order_id: string;
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  kind: string;
  content_id: string | null;
  amount_usd: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type ApiSubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_usd: string;
  billing_interval_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ApiPromotionBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_key: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: string;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionBannerImageUploadStart = {
  image_key: string;
  upload_url: string;
};

export type ApiHeroFeaturedItem = {
  id: string;
  content_type: "movie" | "series";
  content_id: string;
  placement: string;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  content_title: string | null;
  content_slug: string | null;
  poster_key: string | null;
};

export type ApiDashboardSummary = {
  users: {
    total: number;
    admins: number;
    active: number;
  };
  content: {
    movies: number;
    series: number;
    published: number;
    drafts: number;
    review: number;
    scheduled: number;
  };
  payments: {
    total: number;
    succeeded: number;
    pending: number;
    failed: number;
    revenue_usd: string;
  };
  transcodes: {
    pending: number;
    processing: number;
    failed: number;
  };
};

export type ApiTopTitleReport = {
  id: string;
  title: string;
  type: string;
  status: string;
  revenue_usd: string;
  purchase_count: number;
  watch_count: number;
  completion_count: number;
};

export type ApiRevenueTimelinePoint = {
  date: string;
  revenue_usd: string;
  payment_count: number;
};

export type ApiRevenueTimeline = {
  days: number;
  date_from: string | null;
  date_to: string | null;
  period_revenue_usd: string;
  all_time_revenue_usd: string;
  succeeded_payments: number;
  points: ApiRevenueTimelinePoint[];
};

export type AdminRevenueTimelineQuery = {
  days?: number;
  dateFrom?: string;
  dateTo?: string;
};

function apiUrl(path: string) {
  const base = resolveApiUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function errorMessageFromResponse(res: Response) {
  let message = `Request failed with ${res.status}`;
  try {
    const body = (await res.json()) as { detail?: unknown; message?: unknown };
    const detail = body.detail ?? body.message;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return null;
        })
        .filter(Boolean)
        .join(", ") || message;
    }
  } catch {
    // Keep the HTTP status message.
  }
  return message;
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Only an authentication failure (401) should drop the session. A 403 means the
    // token is valid but the action is not allowed (e.g. acting on your own account),
    // so it must surface as an error instead of logging the admin out.
    if (res.status === 401) {
      clearAdminToken();
    }
    throw new Error(await errorMessageFromResponse(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  return parseApiResponse<T>(res);
}

export async function loginAdmin(email: string, password: string) {
  const body = new FormData();
  body.set("email", email);
  body.set("password", password);
  const result = await apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body,
  });
  setAdminToken(result.access_token);
  const me = await apiFetch<ApiUser>("/users/me");
  if (me.role !== "admin") {
    clearAdminToken();
    throw new Error("This account does not have admin access.");
  }
  return result;
}

export async function fetchTranscodeJobsProgress(): Promise<Record<string, number>> {
  return apiFetch<Record<string, number>>("/admin/transcode-jobs/progress");
}

export async function cancelTranscodeJob(jobId: string): Promise<{ job_id: string; cancelled: boolean }> {
  return apiFetch<{ job_id: string; cancelled: boolean }>(
    `/admin/transcode-jobs/${jobId}/cancel`,
    { method: "POST" },
  );
}

export async function listUsers(query: PaginationQuery = {}) {
  return apiFetch<PaginatedResponse<ApiUser>>(`/users${paginationQuery(query)}`);
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await apiFetch<void>(`/users/${userId}`, { method: "DELETE" });
}

export async function listAdminMovies(query: PaginationQuery = {}) {
  return apiFetch<PaginatedResponse<ApiContent>>(`/admin/movies${paginationQuery(query)}`);
}

export async function listAllAdminMovies() {
  return fetchAllPages((page, pageSize) => listAdminMovies({ page, pageSize }));
}

export async function getAdminMovie(id: string): Promise<ApiContent> {
  return apiFetch<ApiContent>(`/admin/movies/${id}`);
}

export async function createAdminMovieDraft(input: {
  title: string;
  description?: string;
  genres: string[];
  releaseYear?: number;
  rating?: string;
  runtimeMinutes?: number;
  priceUsd: string;
  trailerUrl?: string;
}) {
  return apiFetch<ApiContent>("/admin/movies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description || null,
      genres: input.genres,
      release_year: input.releaseYear ?? null,
      rating: input.rating || null,
      runtime_minutes: input.runtimeMinutes ?? null,
      price_usd: input.priceUsd,
      trailer_url: input.trailerUrl || null,
    }),
  });
}

export async function updateAdminMovie(
  id: string,
  input: {
    title: string;
    description?: string | null;
    genres: string[];
    priceUsd?: string | null;
    rating?: string | null;
    runtimeMinutes?: number | null;
    releaseYear?: number | null;
    status: string;
    trailerUrl?: string | null;
  },
) {
  return apiFetch<ApiContent>(`/admin/movies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? null,
      genres: input.genres,
      price_usd: input.priceUsd || null,
      rating: input.rating || null,
      runtime_minutes: input.runtimeMinutes ?? null,
      release_year: input.releaseYear ?? null,
      status: input.status,
      trailer_url: input.trailerUrl || null,
    }),
  });
}

export async function deleteAdminMovie(id: string) {
  await apiFetch<void>(`/admin/movies/${id}`, {
    method: "DELETE",
  });
}

function normalizeAssetContentType(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function startAdminMovieAssetUpload(
  id: string,
  input: {
    videoContentType?: string | null;
    posterContentType?: string | null;
    bannerContentType?: string | null;
  },
) {
  return apiFetch<MovieAssetUploadStartResponse>(`/admin/movies/${id}/assets/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_content_type: normalizeAssetContentType(input.videoContentType),
      poster_content_type: normalizeAssetContentType(input.posterContentType),
      banner_content_type: normalizeAssetContentType(input.bannerContentType),
    }),
  });
}

export async function uploadAdminMovieAsset(
  id: string,
  kind: "poster" | "banner" | "video",
  file: File,
  onProgress?: (percent: number) => void,
) {
  const contentType = kind === "video" ? videoContentType(file) : imageContentType(file);
  const startInput =
    kind === "poster"
      ? { posterContentType: contentType }
      : kind === "banner"
        ? { bannerContentType: contentType }
        : { videoContentType: contentType };

  const upload = await startAdminMovieAssetUpload(id, startInput);

  const uploadUrl =
    kind === "poster"
      ? upload.poster_upload_url
      : kind === "banner"
        ? upload.banner_upload_url
        : upload.video_upload_url;
  const assetKey =
    kind === "poster"
      ? upload.poster_key
      : kind === "banner"
        ? upload.banner_key
        : upload.source_key;

  if (!uploadUrl || !assetKey) {
    throw new Error(`Could not start ${kind} upload. Restart the API if you are uploading a banner.`);
  }

  await uploadFileToPresignedUrl(uploadUrl, file, onProgress, contentType);
  await completeAdminMovieAssetUpload(id, {
    sourceKey: kind === "video" ? assetKey : null,
    posterKey: kind === "poster" ? assetKey : null,
    bannerKey: kind === "banner" ? assetKey : null,
  });
}

function hasUploadFile(file: File | null | undefined): file is File {
  return Boolean(file && file.size > 0);
}

export async function uploadAdminMovieAssets(
  id: string,
  assets: { poster?: File | null; banner?: File | null; video?: File | null },
  onVideoProgress?: (percent: number) => void,
) {
  const poster = hasUploadFile(assets.poster) ? assets.poster : null;
  const banner = hasUploadFile(assets.banner) ? assets.banner : null;
  const video = hasUploadFile(assets.video) ? assets.video : null;
  if (!poster && !banner && !video) return;

  if (poster) await uploadAdminMovieAsset(id, "poster", poster);
  if (banner) await uploadAdminMovieAsset(id, "banner", banner);
  if (video) await uploadAdminMovieAsset(id, "video", video, onVideoProgress);
}

export async function completeAdminMovieAssetUpload(
  id: string,
  input: {
    sourceKey?: string | null;
    posterKey?: string | null;
    bannerKey?: string | null;
  },
) {
  return apiFetch<ApiContent>(`/admin/movies/${id}/assets/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_key: input.sourceKey ?? null,
      poster_key: input.posterKey ?? null,
      banner_key: input.bannerKey ?? null,
    }),
  });
}

export async function startMovieUpload(input: {
  title: string;
  fileSizeBytes: number;
  videoContentType: string;
  posterContentType?: string;
  bannerContentType?: string;
}) {
  return apiFetch<MovieUploadStartResponse>("/movies/uploads/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      file_size_bytes: input.fileSizeBytes,
      video_content_type: input.videoContentType,
      poster_content_type: input.posterContentType ?? null,
      banner_content_type: input.bannerContentType ?? null,
    }),
  });
}

export async function getMovieUploadPartUrl(input: {
  sourceKey: string;
  uploadId: string;
  partNumber: number;
}) {
  const params = new URLSearchParams({
    source_key: input.sourceKey,
    upload_id: input.uploadId,
    part_number: String(input.partNumber),
  });
  return apiFetch<{ url: string }>(`/movies/uploads/part-url?${params}`);
}

export async function completeMovieUpload(input: {
  contentId: string;
  slug: string;
  sourceKey: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
  title: string;
  priceUsd: string;
  description?: string;
  genres: string[];
  releaseYear?: number;
  rating?: string;
  runtimeMinutes?: number;
  status: string;
  posterKey?: string | null;
  bannerKey?: string | null;
  trailerUrl?: string | null;
}) {
  return apiFetch<ApiContent>("/movies/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_id: input.contentId,
      slug: input.slug,
      source_key: input.sourceKey,
      upload_id: input.uploadId,
      parts: input.parts.map((p) => ({
        part_number: p.partNumber,
        etag: p.etag,
      })),
      title: input.title,
      price_usd: input.priceUsd,
      description: input.description || null,
      genres: input.genres,
      release_year: input.releaseYear ?? null,
      rating: input.rating || null,
      runtime_minutes: input.runtimeMinutes ?? null,
      status: input.status,
      poster_key: input.posterKey ?? null,
      banner_key: input.bannerKey ?? null,
      trailer_url: input.trailerUrl || null,
    }),
  });
}

function uploadBlobToPresignedUrl(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Upload succeeded but ETag header is missing"));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Upload failed with ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your network and R2 CORS settings."));
    xhr.send(blob);
  });
}

export function uploadFileToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
  contentType?: string,
) {
  const resolvedType = contentType || file.type || inferFileContentType(file);
  return uploadBlobToPresignedUrl(url, file, resolvedType, onProgress).then(() => undefined);
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  await runWithConcurrency(items, limit, async (item, index) => {
    await fn(item, index);
    return undefined;
  });
}

export { EPISODE_UPLOAD_CONCURRENCY };

async function uploadVideoMultipart(
  file: File,
  input: {
    partSize: number;
    partUrls: MultipartPartUrl[];
    getPartUrl?: (partNumber: number) => Promise<string>;
  },
  onProgress?: (percent: number) => void,
): Promise<{ partNumber: number; etag: string }[]> {
  const contentType = file.type || "video/mp4";
  const partSize = input.partSize;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));
  const urlByPart = new Map(input.partUrls.map((part) => [part.part_number, part.url]));
  const bytesLoaded = new Array<number>(totalParts + 1).fill(0);

  const reportProgress = () => {
    if (!onProgress) return;
    const loaded = bytesLoaded.slice(1).reduce((sum, value) => sum + value, 0);
    onProgress(Math.min(100, Math.round((loaded / file.size) * 100)));
  };

  const uploadPart = async (partNumber: number) => {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    let url = urlByPart.get(partNumber);
    if (!url && input.getPartUrl) {
      url = await input.getPartUrl(partNumber);
    }
    if (!url) {
      throw new Error(`Missing presigned URL for part ${partNumber}`);
    }

    const etag = await uploadBlobToPresignedUrl(url, chunk, contentType, (percent) => {
      bytesLoaded[partNumber] = Math.round((chunk.size * percent) / 100);
      reportProgress();
    });
    bytesLoaded[partNumber] = chunk.size;
    reportProgress();
    return { partNumber, etag };
  };

  const partNumbers = Array.from({ length: totalParts }, (_, index) => index + 1);
  const parts = await runWithConcurrency(
    partNumbers,
    MULTIPART_UPLOAD_CONCURRENCY,
    (partNumber) => uploadPart(partNumber),
  );
  return parts.sort((a, b) => a.partNumber - b.partNumber);
}

export async function uploadMovieVideoMultipart(
  file: File,
  input: {
    partSize: number;
    partUrls: MultipartPartUrl[];
    sourceKey?: string;
    uploadId?: string;
  },
  onProgress?: (percent: number) => void,
) {
  return uploadVideoMultipart(
    file,
    {
      partSize: input.partSize,
      partUrls: input.partUrls,
      getPartUrl:
        input.sourceKey && input.uploadId
          ? async (partNumber) => {
              const { url } = await getMovieUploadPartUrl({
                sourceKey: input.sourceKey!,
                uploadId: input.uploadId!,
                partNumber,
              });
              return url;
            }
          : undefined,
    },
    onProgress,
  );
}

// ── Series ──────────────────────────────────────────────────────────────────

export type ApiSeriesEpisode = {
  id: string;
  slug: string;
  episode_number: number | null;
  season_number: number | null;
  title: string;
  runtime: string | null;
  poster_key: string | null;
  hls_master_key: string | null;
  status: string;
  is_free: boolean;
  transcode_status: string;
};

export type ApiSeasonRead = {
  season_number: number;
  episodes: ApiSeriesEpisode[];
};

export async function listSeriesEpisodesApi(slug: string): Promise<ApiSeasonRead[]> {
  return apiFetch<ApiSeasonRead[]>(`/admin/series/${slug}/episodes`);
}

export async function listAdminSeries(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiSeries>> {
  return apiFetch<PaginatedResponse<ApiSeries>>(`/admin/series${paginationQuery(query)}`);
}

export async function listAllAdminSeries(): Promise<ApiSeries[]> {
  return fetchAllPages((page, pageSize) => listAdminSeries({ page, pageSize }));
}

export async function getAdminSeriesById(id: string): Promise<ApiSeries> {
  return apiFetch<ApiSeries>(`/admin/series/${id}`);
}

export async function createSeries(input: {
  title: string;
  monthlyPriceUsd: string;
  description?: string;
  genres: string[];
  releaseYear?: number;
  rating?: string;
  trailerUrl?: string;
}): Promise<ApiSeries> {
  return apiFetch<ApiSeries>("/series/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      monthly_price_usd: input.monthlyPriceUsd || "0",
      description: input.description ?? null,
      genres: input.genres,
      release_year: input.releaseYear ?? null,
      rating: input.rating ?? null,
      trailer_url: input.trailerUrl ?? null,
    }),
  });
}

type SeriesPosterStartResponse = {
  series_id: string;
  poster_key: string;
  poster_upload_url: string;
};

type SeriesBannerStartResponse = {
  series_id: string;
  banner_key: string;
  banner_upload_url: string;
};

export async function uploadSeriesAsset(
  slug: string,
  kind: "poster" | "banner",
  file: File,
) {
  const contentType = imageContentType(file);
  const start =
    kind === "poster"
      ? await apiFetch<SeriesPosterStartResponse>(`/series/${slug}/poster/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poster_content_type: contentType }),
        })
      : await apiFetch<SeriesBannerStartResponse>(`/series/${slug}/banner/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banner_content_type: contentType }),
        });

  const uploadUrl =
    kind === "poster"
      ? (start as SeriesPosterStartResponse).poster_upload_url
      : (start as SeriesBannerStartResponse).banner_upload_url;
  const assetKey =
    kind === "poster"
      ? (start as SeriesPosterStartResponse).poster_key
      : (start as SeriesBannerStartResponse).banner_key;

  await uploadFileToPresignedUrl(uploadUrl, file, undefined, contentType);
  await updateSeriesApi(slug, {
    ...(kind === "poster" ? { poster_key: assetKey } : { banner_key: assetKey }),
  });
}

export async function uploadSeriesAssets(
  slug: string,
  assets: { poster?: File | null; banner?: File | null },
) {
  const poster = hasUploadFile(assets.poster) ? assets.poster : null;
  const banner = hasUploadFile(assets.banner) ? assets.banner : null;
  if (poster) await uploadSeriesAsset(slug, "poster", poster);
  if (banner) await uploadSeriesAsset(slug, "banner", banner);
}

export async function updateSeriesApi(
  slug: string,
  data: Partial<{
    title: string;
    description: string | null;
    genres: string[];
    rating: string | null;
    monthly_price_usd: string;
    is_published: boolean;
    poster_key: string | null;
    banner_key: string | null;
    trailer_url: string | null;
    release_year: number | null;
  }>,
): Promise<ApiSeries> {
  return apiFetch<ApiSeries>(`/series/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminSeriesApi(slug: string): Promise<void> {
  return apiFetch<void>(`/series/${slug}`, { method: "DELETE" });
}

export async function updateEpisodeApi(
  seriesSlug: string,
  episodeSlug: string,
  data: Partial<{
    title: string;
    runtime: string | null;
    isFree: boolean;
    status: string;
  }>,
): Promise<ApiContent> {
  return apiFetch<ApiContent>(`/series/${seriesSlug}/episodes/${episodeSlug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.runtime !== undefined ? { runtime: data.runtime } : {}),
      ...(data.isFree !== undefined ? { is_free: data.isFree } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    }),
  });
}

export async function startEpisodeUpload(
  seriesSlug: string,
  input: {
    seasonNumber: number;
    episodeNumber: number;
    fileSizeBytes: number;
    videoContentType: string;
    posterContentType?: string;
  },
) {
  return apiFetch<EpisodeUploadStartResponse>(`/series/${seriesSlug}/episodes/uploads/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      season_number: input.seasonNumber,
      episode_number: input.episodeNumber,
      file_size_bytes: input.fileSizeBytes,
      video_content_type: input.videoContentType,
      poster_content_type: input.posterContentType ?? null,
    }),
  });
}

export async function getEpisodeUploadPartUrl(
  seriesSlug: string,
  input: {
    sourceKey: string;
    uploadId: string;
    partNumber: number;
  },
) {
  const params = new URLSearchParams({
    source_key: input.sourceKey,
    upload_id: input.uploadId,
    part_number: String(input.partNumber),
  });
  return apiFetch<{ url: string }>(`/series/${seriesSlug}/episodes/uploads/part-url?${params}`);
}

export async function completeEpisodeUpload(
  seriesSlug: string,
  input: {
    contentId: string;
    episodeSlug: string;
    sourceKey: string;
    uploadId: string;
    parts: { partNumber: number; etag: string }[];
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    description?: string;
    runtime?: string;
    status: string;
    isFree?: boolean;
    posterKey?: string | null;
  },
) {
  return apiFetch<ApiContent>(`/series/${seriesSlug}/episodes/uploads/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_id: input.contentId,
      episode_slug: input.episodeSlug,
      source_key: input.sourceKey,
      upload_id: input.uploadId,
      parts: input.parts.map((part) => ({
        part_number: part.partNumber,
        etag: part.etag,
      })),
      title: input.title,
      season_number: input.seasonNumber,
      episode_number: input.episodeNumber,
      description: input.description ?? null,
      runtime: input.runtime ?? null,
      status: input.status,
      is_free: input.isFree ?? false,
      poster_key: input.posterKey ?? null,
    }),
  });
}

export async function uploadEpisodeVideoMultipart(
  file: File,
  seriesSlug: string,
  input: {
    partSize: number;
    partUrls: MultipartPartUrl[];
    sourceKey: string;
    uploadId: string;
  },
  onProgress?: (percent: number) => void,
) {
  return uploadVideoMultipart(
    file,
    {
      partSize: input.partSize,
      partUrls: input.partUrls,
      getPartUrl: async (partNumber) => {
        const { url } = await getEpisodeUploadPartUrl(seriesSlug, {
          sourceKey: input.sourceKey,
          uploadId: input.uploadId,
          partNumber,
        });
        return url;
      },
    },
    onProgress,
  );
}

/** Upload one episode video (and optional poster) via multipart direct-to-R2. */
export async function uploadEpisodeWithAssets(
  seriesSlug: string,
  data: {
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    description?: string;
    runtime?: string;
    status: string;
    isFree?: boolean;
  },
  videoFile: File,
  posterFile?: File,
  onProgress?: (percent: number) => void,
): Promise<ApiContent> {
  const upload = await startEpisodeUpload(seriesSlug, {
    seasonNumber: data.seasonNumber,
    episodeNumber: data.episodeNumber,
    fileSizeBytes: videoFile.size,
    videoContentType: videoFile.type || "video/mp4",
    posterContentType: posterFile?.type,
  });

  if (posterFile && upload.poster_upload_url) {
    await uploadFileToPresignedUrl(upload.poster_upload_url, posterFile);
  }

  const parts = await uploadEpisodeVideoMultipart(
    videoFile,
    seriesSlug,
    {
      partSize: upload.part_size,
      partUrls: upload.part_urls,
      sourceKey: upload.source_key,
      uploadId: upload.upload_id,
    },
    onProgress,
  );

  return completeEpisodeUpload(seriesSlug, {
    contentId: upload.content_id,
    episodeSlug: upload.episode_slug,
    sourceKey: upload.source_key,
    uploadId: upload.upload_id,
    parts,
    title: data.title,
    seasonNumber: data.seasonNumber,
    episodeNumber: data.episodeNumber,
    description: data.description,
    runtime: data.runtime,
    status: data.status,
    isFree: data.isFree,
    posterKey: upload.poster_key,
  });
}

// ── Transcode jobs ───────────────────────────────────────────────────────────

export async function listTranscodeJobs(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<TranscodeJob>> {
  return apiFetch<PaginatedResponse<TranscodeJob>>(
    `/admin/transcode-jobs${paginationQuery(query)}`,
  );
}

export async function retryTranscodeJob(jobId: string): Promise<TranscodeJob> {
  return apiFetch<TranscodeJob>(`/admin/transcode-jobs/${jobId}/retry`, { method: "POST" });
}

export async function listAdminPayments(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiPaymentIntent>> {
  return apiFetch<PaginatedResponse<ApiPaymentIntent>>(
    `/admin/payments${paginationQuery(query)}`,
  );
}

export async function listAdminSubscriptionPlans(): Promise<ApiSubscriptionPlan[]> {
  return apiFetch<ApiSubscriptionPlan[]>("/admin/subscription-plans");
}

export async function createAdminSubscriptionPlan(input: {
  code: string;
  name: string;
  description?: string | null;
  priceUsd: string;
  billingIntervalDays?: number;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ApiSubscriptionPlan> {
  return apiFetch<ApiSubscriptionPlan>("/admin/subscription-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      price_usd: input.priceUsd,
      billing_interval_days: input.billingIntervalDays ?? 30,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    }),
  });
}

export async function updateAdminSubscriptionPlan(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    priceUsd: string;
    billingIntervalDays: number;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<ApiSubscriptionPlan> {
  return apiFetch<ApiSubscriptionPlan>(`/admin/subscription-plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priceUsd !== undefined ? { price_usd: input.priceUsd } : {}),
      ...(input.billingIntervalDays !== undefined
        ? { billing_interval_days: input.billingIntervalDays }
        : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
    }),
  });
}

export async function deleteAdminSubscriptionPlan(id: string): Promise<void> {
  await apiFetch<void>(`/admin/subscription-plans/${id}`, { method: "DELETE" });
}

export async function getAdminDashboardSummary(): Promise<ApiDashboardSummary> {
  return apiFetch<ApiDashboardSummary>("/admin/dashboard-summary");
}

export async function getAdminRevenueTimeline(
  query: AdminRevenueTimelineQuery = {},
): Promise<ApiRevenueTimeline> {
  const search = new URLSearchParams();
  search.set("days", String(query.days ?? 30));
  if (query.dateFrom) search.set("date_from", query.dateFrom);
  if (query.dateTo) search.set("date_to", query.dateTo);
  return apiFetch<ApiRevenueTimeline>(`/admin/revenue-timeline?${search.toString()}`);
}

export async function listAdminTopTitles(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiTopTitleReport>> {
  return apiFetch<PaginatedResponse<ApiTopTitleReport>>(
    `/admin/reports/top-titles${paginationQuery(query)}`,
  );
}

export type ApiComment = {
  id: string;
  content_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    display_name: string;
  };
};

export async function listAdminComments(
  contentId: string,
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiComment>> {
  const search = new URLSearchParams();
  search.set("content_id", contentId);
  if (query.page != null) search.set("page", String(query.page));
  if (query.pageSize != null) search.set("page_size", String(query.pageSize));
  return apiFetch<PaginatedResponse<ApiComment>>(`/admin/comments?${search}`);
}

export async function updateAdminComment(
  commentId: string,
  body: string,
): Promise<ApiComment> {
  return apiFetch<ApiComment>(`/admin/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function deleteAdminComment(commentId: string): Promise<void> {
  await apiFetch<void>(`/admin/comments/${commentId}`, { method: "DELETE" });
}

export async function listAdminPromotionBanners(): Promise<ApiPromotionBanner[]> {
  return apiFetch<ApiPromotionBanner[]>("/admin/promotion-banners");
}

export async function createAdminPromotionBanner(input: {
  title: string;
  subtitle?: string | null;
  imageKey?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  placement?: string;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ApiPromotionBanner> {
  return apiFetch<ApiPromotionBanner>("/admin/promotion-banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      subtitle: input.subtitle ?? null,
      image_key: input.imageKey ?? null,
      cta_label: input.ctaLabel ?? null,
      cta_href: input.ctaHref ?? null,
      placement: input.placement ?? "home",
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
    }),
  });
}

export async function updateAdminPromotionBanner(
  id: string,
  input: Partial<{
    title: string;
    subtitle: string | null;
    imageKey: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    placement: string;
    isActive: boolean;
    sortOrder: number;
    startsAt: string | null;
    endsAt: string | null;
  }>,
): Promise<ApiPromotionBanner> {
  return apiFetch<ApiPromotionBanner>(`/admin/promotion-banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.imageKey !== undefined ? { image_key: input.imageKey } : {}),
      ...(input.ctaLabel !== undefined ? { cta_label: input.ctaLabel } : {}),
      ...(input.ctaHref !== undefined ? { cta_href: input.ctaHref } : {}),
      ...(input.placement !== undefined ? { placement: input.placement } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      ...(input.startsAt !== undefined ? { starts_at: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { ends_at: input.endsAt } : {}),
    }),
  });
}

export async function deleteAdminPromotionBanner(id: string): Promise<void> {
  await apiFetch<void>(`/admin/promotion-banners/${id}`, { method: "DELETE" });
}

export async function startAdminPromotionBannerImageUpload(
  bannerId: string,
  contentType: string,
): Promise<PromotionBannerImageUploadStart> {
  return apiFetch<PromotionBannerImageUploadStart>(
    `/admin/promotion-banners/${bannerId}/image/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType }),
    },
  );
}

export async function listAdminHeroFeatured(): Promise<ApiHeroFeaturedItem[]> {
  return apiFetch<ApiHeroFeaturedItem[]>("/admin/hero-featured");
}

export async function createAdminHeroFeatured(input: {
  contentType: "movie" | "series";
  contentId: string;
  placement?: string;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ApiHeroFeaturedItem> {
  return apiFetch<ApiHeroFeaturedItem>("/admin/hero-featured", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_type: input.contentType,
      content_id: input.contentId,
      placement: input.placement ?? "home",
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
    }),
  });
}

export async function updateAdminHeroFeatured(
  id: string,
  input: Partial<{
    contentType: "movie" | "series";
    contentId: string;
    placement: string;
    isActive: boolean;
    sortOrder: number;
    startsAt: string | null;
    endsAt: string | null;
  }>,
): Promise<ApiHeroFeaturedItem> {
  return apiFetch<ApiHeroFeaturedItem>(`/admin/hero-featured/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.contentType !== undefined ? { content_type: input.contentType } : {}),
      ...(input.contentId !== undefined ? { content_id: input.contentId } : {}),
      ...(input.placement !== undefined ? { placement: input.placement } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      ...(input.startsAt !== undefined ? { starts_at: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { ends_at: input.endsAt } : {}),
    }),
  });
}

export async function deleteAdminHeroFeatured(id: string): Promise<void> {
  await apiFetch<void>(`/admin/hero-featured/${id}`, { method: "DELETE" });
}

export type ApiGenre = {
  id: string;
  name: string;
  created_at: string;
};

export async function listGenres(): Promise<ApiGenre[]> {
  return apiFetch<ApiGenre[]>("/genres/");
}

export async function createGenre(name: string): Promise<ApiGenre> {
  return apiFetch<ApiGenre>("/genres/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteGenre(id: string): Promise<void> {
  await apiFetch<void>(`/genres/${id}`, { method: "DELETE" });
}

