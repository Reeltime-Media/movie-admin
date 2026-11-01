import { NextResponse } from "next/server";
import { PIN_COOKIE, createPinCookie, getAdminPin } from "../../../../lib/admin-pin";

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
  const cookie = await createPinCookie(expectedPin);
  response.cookies.set(PIN_COOKIE, cookie.value, {
    path: "/",
    maxAge: cookie.maxAge,
    sameSite: "lax",
    httpOnly: true,
    secure: isSecureRequest(request),
  });
  return response;
}
