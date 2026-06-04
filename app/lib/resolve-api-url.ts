const GCP_API_HOST = "34.124.135.215";
const GCP_API_PORT = "8000";
const VERCEL_API_PROXY = "/api-proxy";

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

/**
 * Browser on HTTPS (Vercel) must use same-origin /api-proxy — never http:// GCP (mixed content).
 * Server Components use API_PROXY_TARGET to call GCP directly.
 */
export function resolveApiUrl(): string {
  if (typeof window !== "undefined") {
    if (window.location.protocol === "https:") {
      return VERCEL_API_PROXY;
    }
    return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
  }

  const direct = process.env.API_PROXY_TARGET?.trim();
  if (direct) return normalizeApiUrl(direct);

  const fromPublic = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  if (fromPublic.trim().startsWith("/")) {
    return normalizeApiUrl(direct ?? "http://localhost:8000");
  }
  return normalizeApiUrl(fromPublic);
}
