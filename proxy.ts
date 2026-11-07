import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PIN_COOKIE, isValidPinCookie } from "./lib/admin-pin";

const PIN_PATH = "/pin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow PIN verification API through
  if (pathname.startsWith("/api/pin")) {
    return NextResponse.next();
  }

  const hasPinAccess = await isValidPinCookie(request.cookies.get(PIN_COOKIE)?.value);

  if (pathname === PIN_PATH || pathname.startsWith(`${PIN_PATH}/`)) {
    if (hasPinAccess) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Guard all admin routes and login with PIN access
  if (!hasPinAccess) {
    return NextResponse.redirect(new URL(PIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api-proxy).*)"],
};
