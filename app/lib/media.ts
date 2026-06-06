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

export function mediaUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (!MEDIA_BASE_URL) return null;
  return `${MEDIA_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}
