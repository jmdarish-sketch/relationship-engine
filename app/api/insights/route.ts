import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, unauthorized } from "@/lib/api/response";

// GET /api/insights?person_id=&type=
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const params = request.nextUrl.searchParams;
  const personId = params.get("person_id") ?? undefined;
  const insightType = params.get("type") ?? undefined;

  const insights = await prisma.insight.findMany({
    where: {
      userId,
      ...(personId && { personId }),
      ...(insightType && { insightType }),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok(insights);
}
