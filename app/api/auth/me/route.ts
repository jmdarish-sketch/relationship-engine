import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns the current authenticated user. This is an auth route
 * (not protected by middleware), so we verify tokens manually.
 */
export async function GET(request: NextRequest) {
  // Try access token
  let userId: string | null = null;

  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) userId = payload.userId;
  }

  // Fall back to refresh token
  if (!userId) {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload) userId = payload.userId;
    }
  }

  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user });
}
