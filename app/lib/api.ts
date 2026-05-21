import {
  fetchAllPages,
  paginationQuery,
  type PaginatedResponse,
  type PaginationQuery,
} from "./pagination";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
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
};

export type MovieUploadStartResponse = {
  content_id: string;
  source_key: string;
  video_upload_url: string;
  poster_key: string | null;
  poster_upload_url: string | null;
};

export type MovieAssetUploadStartResponse = {
  source_key: string | null;
  video_upload_url: string | null;
  poster_key: string | null;
  poster_upload_url: string | null;
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
  trailer_url: string | null;
  hls_master_key: string | null;
  price_usd: string | null;
  status: string;
  is_published: boolean;
  transcode_status: string;
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
  kind: string;
  content_id: string | null;
  amount_usd: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
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

function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
    if (res.status === 401 || res.status === 403) {
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
  return result;
}

export async function listUsers(query: PaginationQuery = {}) {
  return apiFetch<PaginatedResponse<ApiUser>>(`/users/${paginationQuery(query)}`);
}

export async function listAdminMovies(query: PaginationQuery = {}) {
  return apiFetch<PaginatedResponse<ApiContent>>(`/admin/movies${paginationQuery(query)}`);
}

export async function listAllAdminMovies() {
  return fetchAllPages((page, pageSize) => listAdminMovies({ page, pageSize }));
}

export async function updateAdminMovie(
  id: string,
  input: {
    title: string;
    description?: string | null;
    genres: string[];
    priceUsd?: string | null;
    rating?: string | null;
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

export async function startAdminMovieAssetUpload(
  id: string,
  input: {
    videoContentType?: string;
    posterContentType?: string;
  },
) {
  return apiFetch<MovieAssetUploadStartResponse>(`/admin/movies/${id}/assets/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_content_type: input.videoContentType ?? null,
      poster_content_type: input.posterContentType ?? null,
    }),
  });
}

export async function completeAdminMovieAssetUpload(
  id: string,
  input: {
    sourceKey?: string | null;
    posterKey?: string | null;
  },
) {
  return apiFetch<ApiContent>(`/admin/movies/${id}/assets/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_key: input.sourceKey ?? null,
      poster_key: input.posterKey ?? null,
    }),
  });
}

export async function startMovieUpload(input: {
  videoContentType: string;
  posterContentType?: string;
}) {
  return apiFetch<MovieUploadStartResponse>("/movies/uploads/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_content_type: input.videoContentType,
      poster_content_type: input.posterContentType ?? null,
    }),
  });
}

export async function completeMovieUpload(input: {
  contentId: string;
  sourceKey: string;
  title: string;
  priceUsd: string;
  description?: string;
  genres: string[];
  releaseYear?: number;
  rating?: string;
  runtime?: string;
  status: string;
  posterKey?: string | null;
  trailerUrl?: string | null;
}) {
  return apiFetch<ApiContent>("/movies/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_id: input.contentId,
      source_key: input.sourceKey,
      title: input.title,
      price_usd: input.priceUsd,
      description: input.description || null,
      genres: input.genres,
      release_year: input.releaseYear ?? null,
      rating: input.rating || null,
      runtime: input.runtime || null,
      status: input.status,
      poster_key: input.posterKey ?? null,
      trailer_url: input.trailerUrl || null,
    }),
  });
}

export function uploadFileToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your network and R2 CORS settings."));
    xhr.send(file);
  });
}

// ── Series ──────────────────────────────────────────────────────────────────

export type ApiSeriesEpisode = {
  id: string;
  episode_number: number | null;
  season_number: number | null;
  title: string;
  runtime: string | null;
  poster_key: string | null;
  hls_master_key: string | null;
  status: string;
  transcode_status: string;
};

export type ApiSeasonRead = {
  season_number: number;
  episodes: ApiSeriesEpisode[];
};

export async function listSeriesEpisodesApi(slug: string): Promise<ApiSeasonRead[]> {
  return apiFetch<ApiSeasonRead[]>(`/admin/series/${slug}/episodes`);
}

async function multipartPost<T>(path: string, body: FormData): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { method: "POST", headers, body });
  return parseApiResponse<T>(res);
}

export async function listAdminSeries(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiSeries>> {
  return apiFetch<PaginatedResponse<ApiSeries>>(`/admin/series${paginationQuery(query)}`);
}

export async function listAllAdminSeries(): Promise<ApiSeries[]> {
  return fetchAllPages((page, pageSize) => listAdminSeries({ page, pageSize }));
}

export async function createSeries(input: {
  title: string;
  monthlyPriceUsd: string;
  description?: string;
  genres: string[];
  releaseYear?: number;
  rating?: string;
  trailerUrl?: string;
  poster?: File;
}): Promise<ApiSeries> {
  const fd = new FormData();
  fd.append("title", input.title);
  fd.append("monthly_price_usd", input.monthlyPriceUsd || "0");
  if (input.description) fd.append("description", input.description);
  if (input.genres.length) fd.append("genres", JSON.stringify(input.genres));
  if (input.releaseYear) fd.append("release_year", String(input.releaseYear));
  if (input.rating) fd.append("rating", input.rating);
  if (input.trailerUrl) fd.append("trailer_url", input.trailerUrl);
  if (input.poster) fd.append("poster", input.poster);
  return multipartPost<ApiSeries>("/series/", fd);
}

export async function updateSeriesApi(
  slug: string,
  data: Partial<{
    title: string;
    genres: string[];
    rating: string | null;
    monthly_price_usd: string | null;
    status: string;
    is_published: boolean;
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

export async function addEpisodeApi(
  seriesSlug: string,
  data: {
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    description?: string;
    runtime?: string;
    status: string;
  },
  videoFile: File,
  posterFile?: File,
): Promise<ApiContent> {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("season_number", String(data.seasonNumber));
  fd.append("episode_number", String(data.episodeNumber));
  if (data.description) fd.append("description", data.description);
  if (data.runtime) fd.append("runtime", data.runtime);
  fd.append("status", data.status);
  fd.append("video", videoFile);
  if (posterFile) fd.append("poster", posterFile);
  return multipartPost<ApiContent>(`/series/${seriesSlug}/episodes`, fd);
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

export async function getAdminDashboardSummary(): Promise<ApiDashboardSummary> {
  return apiFetch<ApiDashboardSummary>("/admin/dashboard-summary");
}

export async function listAdminTopTitles(
  query: PaginationQuery = {},
): Promise<PaginatedResponse<ApiTopTitleReport>> {
  return apiFetch<PaginatedResponse<ApiTopTitleReport>>(
    `/admin/reports/top-titles${paginationQuery(query)}`,
  );
}
