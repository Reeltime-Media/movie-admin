import { NextResponse } from "next/server";

const PIN_COOKIE = "reeltime_admin_pin";

function getAdminPin() {
  const raw =
    process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "1234";
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

  if (pin !== getAdminPin()) {
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
