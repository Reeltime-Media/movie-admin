const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "";

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

export function inferFileContentType(file: File): string {
  const ext = extensionFromFilename(file.name);
  if (["mp4", "mov", "webm", "m3u8"].includes(ext)) {
    return videoContentType(file);
  }
  return imageContentType(file);
}

/**
 * `version`, when given, is appended as a `?v=` query param so a re-uploaded
 * asset (same key, new bytes) busts the browser cache and Cloudflare's edge
 * cache for r2.dev hosts — both key off the full URL including query string.
 */
export function mediaUrl(key?: string | null, version?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (!MEDIA_BASE_URL) return null;
  const url = `${MEDIA_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}
