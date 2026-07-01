import { NextResponse } from "next/server";

const PIN_COOKIE = "reeltime_admin_pin";

function getAdminPin() {
  // Prefer the server-only ADMIN_PIN. NEXT_PUBLIC_ADMIN_PIN is kept only as a
  // fallback for existing deploys, but note that any NEXT_PUBLIC_* var is inlined
  // into the client bundle — set ADMIN_PIN (server-only) instead.
  // The "1234" default is dev-only: in production a missing PIN fails closed
  // rather than accepting a well-known default.
  const configured = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN;
  const raw = configured ?? (process.env.NODE_ENV === "production" ? "" : "1234");
  return raw.trim();
}

/** Only set Secure when the request is actually HTTPS (not merely NODE_ENV=production). */
function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = String(body.pin ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const expectedPin = getAdminPin();
  if (!expectedPin) {
    // Fail closed: never grant access when no PIN is configured.
    return NextResponse.json(
      { ok: false, message: "Admin PIN is not configured" },
      { status: 500 },
    );
  }

  if (pin !== expectedPin) {
    return NextResponse.json({ ok: false, message: "Invalid PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PIN_COOKIE, "verified", {
    path: "/",
    maxAge: 60 * 60 * 12,
    sameSite: "lax",
    httpOnly: true,
    secure: isSecureRequest(request),
  });
  return response;
}
