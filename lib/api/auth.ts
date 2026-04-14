import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

/**
 * Extract authenticated user ID from the request.
 * Uses the x-user-id header set by middleware, falling back to cookie verification.
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  // Middleware sets this header after validating the token
  const fromHeader = request.headers.get("x-user-id");
  if (fromHeader) return fromHeader;

  // Fallback: verify cookie directly
  const token = request.cookies.get("access_token")?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  return payload?.userId ?? null;
}

/**
 * Same as getUserId but throws if not authenticated.
 */
export async function requireUserId(request: NextRequest): Promise<string> {
  const id = await getUserId(request);
  if (!id) throw new Error("Unauthorized");
  return id;
}
