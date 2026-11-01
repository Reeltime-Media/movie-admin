import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PIN_COOKIE, isValidPinCookie } from "./lib/admin-pin";

const PUBLIC_PATHS = ["/login"];
const PIN_PATH = "/pin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPinAccess = await isValidPinCookie(request.cookies.get(PIN_COOKIE)?.value);

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
