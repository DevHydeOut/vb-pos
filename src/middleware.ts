import { NextRequest, NextResponse } from "next/server";

const STAFF_COOKIE  = "staff_session";
const MASTER_COOKIE = "better-auth.session_token";

// Route groups like (auth) and (dashboard) are invisible in the URL.
// Actual URLs based on your folder structure:
//   src/app/(auth)/login/page.tsx    → /login
//   src/app/(dashboard)/...          → /dashboard/...
//   src/app/portal/[siteId]/...      → /portal/[siteId]/...

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasStaffSession  = !!request.cookies.get(STAFF_COOKIE)?.value;
  const hasMasterSession = !!request.cookies.get(MASTER_COOKIE)?.value;

  // ── Rule 1: Block logged-in users from visiting /login ───
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (hasMasterSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (hasStaffSession) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // ── Rule 2: Block unauthenticated from /portal ───────────
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