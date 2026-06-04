const GCP_API_HOST = "34.124.135.215";
const GCP_API_PORT = "8000";

/** Same-origin proxy on Vercel; direct URL for local dev. */
export function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed || trimmed.startsWith("/")) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.hostname === GCP_API_HOST && !u.port) {
      u.port = GCP_API_PORT;
    }
    return u.origin;
  } catch {
    return trimmed;
  }
}

export function resolveApiUrl(): string {
  const fromPublic = normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  );

  if (typeof window === "undefined") {
    const direct = process.env.API_PROXY_TARGET?.trim();
    if (direct) return normalizeApiUrl(direct);
  }

  return fromPublic;
}
