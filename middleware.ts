import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];
const PIN_PATH = "/pin";
const PIN_COOKIE = "reeltime_admin_pin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const hasPinAccess = request.cookies.get(PIN_COOKIE)?.value === "verified";

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    ].join("; "),
  );

  if (pathname === PIN_PATH || pathname.startsWith(`${PIN_PATH}/`)) {
    if (hasPinAccess) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (!hasPinAccess) {
      return NextResponse.redirect(new URL(PIN_PATH, request.url));
    }
    return response;
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
