/** Extra connect-src entries for API calls (GCP http, Vercel /api-proxy uses 'self'). */
export function cspConnectSrc(): string {
  const parts = ["'self'", "https:", "http://localhost:*", "http://127.0.0.1:*"];
  const seen = new Set(parts);

  for (const key of ["API_PROXY_TARGET", "NEXT_PUBLIC_API_URL"] as const) {
    const raw = process.env[key]?.trim().replace(/\/$/, "");
    if (!raw || raw.startsWith("/")) continue;
    if ((raw.startsWith("http://") || raw.startsWith("https://")) && !seen.has(raw)) {
      seen.add(raw);
      parts.push(raw);
    }
  }

  return parts.join(" ");
}
