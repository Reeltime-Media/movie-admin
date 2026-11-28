/** Custom CDN after Cloudflare/R2 migration. Public `*.r2.dev` hosts now 403. */
const CANONICAL_MEDIA_BASE = "https://cdn.reeltime.fun";

function resolveMediaBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
    "";
  if (!raw) return CANONICAL_MEDIA_BASE;
  try {
    const host = new URL(raw).hostname;
    // Vercel still has the old pub-*.r2.dev value baked into some deploys.
    if (host.endsWith(".r2.dev")) return CANONICAL_MEDIA_BASE;
  } catch {
    // ignore invalid env and fall through
  }
  return raw.replace(/\/$/, "");
}

const MEDIA_BASE_URL = resolveMediaBaseUrl();

/** Rewrite absolute keys that still point at retired public R2 hosts. */
function rewriteLegacyMediaHost(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".r2.dev")) {
      parsed.protocol = "https:";
      parsed.hostname = "cdn.reeltime.fun";
      return parsed.toString();
    }
  } catch {
    // leave non-URL strings alone
  }
  return url;
}

function extensionFromFilename(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function imageContentType(file: File): string {
  if (file.type) return file.type;
  switch (extensionFromFilename(file.name)) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "image/jpeg";
  }
}

export function videoContentType(file: File): string {
  if (file.type) return file.type;
  switch (extensionFromFilename(file.name)) {
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    default:
      return "video/mp4";
  }
}

export function audioContentType(file: File): string {
  if (file.type) return file.type;
  switch (extensionFromFilename(file.name)) {
    case "m4a":
      return "audio/mp4";
    case "wav":
      return "audio/wav";
    case "aac":
      return "audio/aac";
    case "mp3":
    default:
      return "audio/mpeg";
  }
}

export function inferFileContentType(file: File): string {
  const ext = extensionFromFilename(file.name);
  if (["mp4", "mov", "webm", "m3u8"].includes(ext)) {
    return videoContentType(file);
  }
  if (["mp3", "m4a", "wav", "aac"].includes(ext)) {
    return audioContentType(file);
  }
  return imageContentType(file);
}

/**
 * `version`, when given, is appended as a `?v=` query param so a re-uploaded
 * asset (same key, new bytes) busts the browser cache and Cloudflare's edge
 * cache for r2.dev hosts — both key off the full URL including query string.
 */
/** Matches POSTER_THUMB_WIDTH in movie-api, which writes these copies at upload. */
const POSTER_THUMB_SUFFIX = "-w400";

export function posterThumbKey(key?: string | null) {
  if (!key || !/(^|\/)poster[^/]*\.[a-z0-9]+$/i.test(key)) return null;
  if (key.includes(`${POSTER_THUMB_SUFFIX}.`)) return null;
  return key.replace(/\.[a-z0-9]+$/i, `${POSTER_THUMB_SUFFIX}.webp`);
}

export function mediaUrl(key?: string | null, version?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return rewriteLegacyMediaHost(key);
  if (!MEDIA_BASE_URL) return null;
  const url = `${MEDIA_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}
