import type { Instrumentation } from "next";

const SOURCE = "admin";

// Server errors (rendering, route handlers, server actions, proxy) go to the
// ops alert relay, which posts them to the Telegram alerts group. Next awaits
// this hook, so the report is sent before the serverless function freezes.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const relayUrl = process.env.ALERT_RELAY_URL;
  const relayToken = process.env.ALERT_RELAY_TOKEN;
  if (!relayUrl || !relayToken) return;

  const error = err instanceof Error ? err : new Error(String(err));
  const digest = (error as Error & { digest?: string }).digest;
  const message = error.message.split("\n")[0].slice(0, 300);
  // Query strings can carry tokens; keep only the path.
  const path = request.path.split("?")[0];
  // Frames only: the stack's first lines repeat the full (multi-line) message.
  const frames = (error.stack ?? "").split("\n").filter((line) => line.trimStart().startsWith("at "));
  const detail = [
    `${request.method} ${path}`,
    `${context.routerKind} ${context.routePath} (${context.routeType})`,
    digest ? `digest: ${digest}` : "",
    frames.join("\n").slice(0, 2000),
  ];

  try {
    await fetch(`${relayUrl.replace(/\/$/, "")}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${relayToken}` },
      body: JSON.stringify({
        source: SOURCE,
        level: "error",
        title: `${error.name}: ${message}`,
        detail: detail.filter(Boolean).join("\n"),
        fingerprint: `${SOURCE}:${context.routePath}:${error.name}:${message}`,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Alerting must never break the request.
  }
};
