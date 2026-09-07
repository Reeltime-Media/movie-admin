import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];
const PIN_PATH = "/pin";
const PIN_COOKIE = "reeltime_admin_pin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPinAccess = request.cookies.get(PIN_COOKIE)?.value === "verified";

  if (pathname === PIN_PATH || pathname.startsWith(`${PIN_PATH}/`)) {
    if (hasPinAccess) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (!hasPinAccess) {
      return NextResponse.redirect(new URL(PIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api-proxy).*)"],
};
