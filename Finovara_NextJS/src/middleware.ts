import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/admin", "/partner", "/ca", "/audit", "/tax", "/gst", "/accountant", "/payroll", "/rm", "/accountsadmin", "/content"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected) {
    // Cookie set by POST /auth/session — presence means authenticated.
    const session = request.cookies.get("fv_session") ?? request.cookies.get("fv_access");
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/partner/:path*", "/ca/:path*", "/audit/:path*", "/tax/:path*", "/gst/:path*", "/accountant/:path*", "/payroll/:path*", "/rm/:path*", "/accountsadmin/:path*", "/content/:path*"],
};
