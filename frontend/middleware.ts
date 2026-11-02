import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/api",
  "/_next",
  "/favicon.ico",
  "/public",
];

const protectedPaths = [
  "/dashboard",
  "/tickets",
  "/knowledge-base",
  "/ai-insights",
  "/analytics",
  "/settings",
  "/team",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("resolveai_access_token")?.value || 
                request.headers.get("Authorization")?.replace("Bearer ", "");

  if (isPublicPath(pathname)) {
    if ((pathname === "/auth/login" || pathname === "/auth/register") && token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  
  if (token) {
    response.headers.set("x-auth-token", token);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};