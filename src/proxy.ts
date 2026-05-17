import { NextRequest, NextResponse } from "next/server";

const STAFF_COOKIE = "staff_session";
const MASTER_COOKIE = "better-auth.session_token";
const SECURE_MASTER_COOKIE = `__Secure-${MASTER_COOKIE}`;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasStaffSession = !!request.cookies.get(STAFF_COOKIE)?.value;
  const hasMasterSession =
    !!request.cookies.get(MASTER_COOKIE)?.value ||
    !!request.cookies.get(SECURE_MASTER_COOKIE)?.value;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (hasMasterSession) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    if (hasStaffSession) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/portal", request.url)));
    }
  }

  if (pathname.startsWith("/portal") && !hasStaffSession && !hasMasterSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (pathname.startsWith("/dashboard") && !hasMasterSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(NextResponse.next());
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
