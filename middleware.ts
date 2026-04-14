import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "./lib/auth";

/**
 * Next.js middleware — runs on every matching request.
 * Protects /api/* routes (except /api/auth/*) with JWT auth.
 * Auto-refreshes expired access tokens using the refresh token.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes and non-API routes
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Also skip the webhook endpoint (authenticated via uid/api key)
  if (pathname.startsWith("/api/webhook/")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Try access token first
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      // Valid access token — inject user_id header for downstream routes
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId);
      return response;
    }
  }

  // Access token missing or expired — try refresh
  if (refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload) {
      // Issue a new access token
      const newAccessToken = await generateAccessToken(payload.userId);

      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId);
      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return response;
    }
  }

  // Both tokens invalid
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"],
};
