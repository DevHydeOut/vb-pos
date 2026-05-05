import { NextRequest, NextResponse } from "next/server";

const STAFF_COOKIE = "staff_session";
const MASTER_COOKIE = "better-auth.session_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasStaffSession = !!request.cookies.get(STAFF_COOKIE)?.value;
  const hasMasterSession = !!request.cookies.get(MASTER_COOKIE)?.value;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (hasMasterSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (hasStaffSession) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  if (pathname.startsWith("/portal") && !hasStaffSession && !hasMasterSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
