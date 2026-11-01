/**
 * CSP connect-src for admin API calls. Browsers reach the API through
 * same-origin /api-proxy, so its address never needs to appear in this header.
 * Set MOVIE_API_ORIGIN only if a browser must call an API host directly.
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

  add(process.env.MOVIE_API_ORIGIN);

  return parts.join(" ");
}
