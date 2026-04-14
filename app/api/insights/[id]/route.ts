import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, notFound, unauthorized } from "@/lib/api/response";

// GET /api/insights/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const insight = await prisma.insight.findFirst({
    where: { id, userId },
    include: {
      person: { select: { id: true, displayName: true } },
    },
  });

  if (!insight) return notFound("Insight not found");

  return ok(insight);
}

// DELETE /api/insights/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const existing = await prisma.insight.findFirst({
    where: { id, userId },
  });
  if (!existing) return notFound("Insight not found");

  await prisma.insight.delete({ where: { id } });

  return ok({ deleted: true });
}
