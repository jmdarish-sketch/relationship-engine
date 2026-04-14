import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { setAuthCookies } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 }
    );
  }

  const [newAccessToken, newRefreshToken] = await Promise.all([
    generateAccessToken(payload.userId),
    generateRefreshToken(payload.userId),
  ]);

  const response = NextResponse.json({ success: true });
  return setAuthCookies(response, newAccessToken, newRefreshToken);
}
