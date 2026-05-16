const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "";

export function mediaUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (!MEDIA_BASE_URL) return null;
  return `${MEDIA_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}
