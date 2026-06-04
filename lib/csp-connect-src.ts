/**
 * CSP connect-src for admin API calls.
 * Vercel: use NEXT_PUBLIC_API_URL=/api-proxy (same-origin, no extra host needed).
 * Direct GCP http URL must be listed explicitly for Edge middleware.
 */
export function cspConnectSrc(): string {
  const parts = ["'self'", "https:", "http://localhost:*", "http://127.0.0.1:*"];
  const seen = new Set(parts);

  const add = (raw: string | undefined) => {
    const v = raw?.trim().replace(/\/$/, "");
    if (!v || v.startsWith("/")) return;
    if ((v.startsWith("http://") || v.startsWith("https://")) && !seen.has(v)) {
      seen.add(v);
      parts.push(v);
    }
  };

  // Inlined at build time when set on Vercel (-b / project env)
  add(process.env.NEXT_PUBLIC_API_URL);
  add(process.env.API_PROXY_TARGET);

  // Production GCP API (fallback if env not inlined on Edge)
  add(process.env.MOVIE_API_ORIGIN ?? "http://34.124.135.215:8000");

  return parts.join(" ");
}
