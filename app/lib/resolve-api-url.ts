/** Browser uses `/api-proxy` on Vercel; server may call GCP directly. */
export function resolveApiUrl(): string {
  const fromPublic = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
    /\/$/,
    "",
  );
  if (typeof window === "undefined") {
    const direct = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    if (direct) return direct;
  }
  return fromPublic;
}
