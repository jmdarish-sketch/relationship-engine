import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Extract the authenticated user_id from the request's access token cookie.
 */
export async function getAuthUserId(
  request: NextRequest
): Promise<string | null> {
  const token = request.cookies.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  return payload?.userId ?? null;
}

/**
 * Get the full user record for the authenticated user.
 */
export async function getCurrentUser(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    omit: { passwordHash: true },
  });
}

/**
 * Require authentication. Returns user_id or throws a 401 NextResponse.
 */
export async function requireAuth(
  request: NextRequest
): Promise<string> {
  const userId = await getAuthUserId(request);
  if (!userId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

/**
 * Set access + refresh token cookies on a response.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  response.cookies.set("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });
  response.cookies.set("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return response;
}

/**
 * Clear auth cookies.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set("access_token", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set("refresh_token", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
